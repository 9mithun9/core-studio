'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { formatStudioTime, isValidBookingTime, createStudioDateTime } from '@/lib/date';
import { addDays, startOfDay } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';
import '@/lib/i18n';

export default function CustomerCalendar() {
  const { t } = useTranslation('customer');
  const [packages, setPackages] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(addDays(new Date(), 2));
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [blockedSlots, setBlockedSlots] = useState<Set<string>>(new Set());
  const [partialSlots, setPartialSlots] = useState<Set<string>>(new Set());
  const [bookingDetails, setBookingDetails] = useState<Map<string, any>>(new Map());
  const [slotAvailability, setSlotAvailability] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    loadPackages();
    loadTeachers();
  }, []);

  useEffect(() => {
    if (selectedTeacher && selectedDate && selectedPackage) {
      loadBlockedSlots();
    }
  }, [selectedTeacher, selectedDate, selectedPackage]);

  const loadPackages = async () => {
    try {
      const data: any = await apiClient.get<any>('/packages/me');
      // Filter packages that are active AND have remaining sessions available for booking
      const activePackagesWithSessions = data.packages.filter((p: any) => {
        const remainingSessions = p.remainingUnbooked ?? p.availableForBooking ?? p.remainingSessions ?? 0;
        return p.status === 'active' && remainingSessions > 0;
      });
      setPackages(activePackagesWithSessions);
      if (activePackagesWithSessions.length > 0) {
        setSelectedPackage(activePackagesWithSessions[0]._id);
      }
    } catch (err) {
      console.error('Failed to load packages', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const loadTeachers = async () => {
    try {
      const data: any = await apiClient.get<any>('/teachers');
      setTeachers(data.teachers);
      if (data.teachers.length > 0) {
        setSelectedTeacher(data.teachers[0]._id);
      }
    } catch (err) {
      console.error('Failed to load teachers', err);
    }
  };

  const loadBlockedSlots = async () => {
    try {
      const startOfSelectedDay = startOfDay(selectedDate);
      const endOfSelectedDay = addDays(startOfSelectedDay, 1);

      const response: any = await apiClient.get('/bookings/availability', {
        params: {
          teacherId: selectedTeacher,
          from: startOfSelectedDay.toISOString(),
          to: endOfSelectedDay.toISOString(),
        },
      });

      const slots = response.slots || [];
      const blocked = new Set<string>();
      const partial = new Set<string>();
      const details = new Map<string, any>();
      const availability = new Map<string, any>();

      const selectedPkg = packages.find((p) => p._id === selectedPackage);
      const myPackageType = selectedPkg?.type || 'private';

      slots.forEach((slot: any) => {
        const slotStart = new Date(slot.startTime);
        const startHour = slotStart.getHours();
        const time = `${startHour.toString().padStart(2, '0')}:00`;

        availability.set(time, slot);

        if (slot.status === 'blocked') {
          blocked.add(time);
        } else if (slot.status === 'partial') {
          if (slot.allowedTypes && slot.allowedTypes.includes(myPackageType)) {
            partial.add(time);
          } else {
            blocked.add(time);
          }
        }

        if (slot.bookings && slot.bookings.length > 0) {
          const bookingInfo = slot.bookings.map((b: any) => ({
            teacherName: b.teacherName,
            type: b.type,
          }));

          details.set(time, {
            bookings: bookingInfo,
            status: slot.status,
            blockReason: slot.blockReason,
            teacherCount: slot.teacherCount,
          });
        }
      });

      setBlockedSlots(blocked);
      setPartialSlots(partial);
      setBookingDetails(details);
      setSlotAvailability(availability);
    } catch (err) {
      console.error('Failed to load blocked slots', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTime) {
      toast.error(t('calendar.errors.selectTime'));
      return;
    }

    if (blockedSlots.has(selectedTime)) {
      toast.error(t('calendar.errors.slotBooked'));
      return;
    }

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const desiredDateTime = createStudioDateTime(selectedDate, hours, minutes);

    if (!isValidBookingTime(desiredDateTime, 24)) {
      toast.error(t('calendar.errors.advanceBooking'));
      return;
    }

    if (!selectedTeacher) {
      toast.error(t('calendar.errors.selectTeacher'));
      return;
    }

    if (!selectedPackage) {
      toast.error(t('calendar.errors.selectPackage'));
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading(t('calendar.submit.submitting'));

    try {
      const selectedPkg = packages.find((p) => p._id === selectedPackage);
      const packageType = selectedPkg?.type || 'private';

      await apiClient.post('/bookings/request', {
        teacherId: selectedTeacher,
        desiredTime: desiredDateTime.toISOString(),
        type: packageType,
        packageId: selectedPackage,
        notes,
      });

      toast.success(t('calendar.bookingSuccess'), {
        id: loadingToast,
        duration: 4000,
      });

      setNotes('');
      setSelectedDate(addDays(new Date(), 1));
      setSelectedTime('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('calendar.errors.requestFailed'), {
        id: loadingToast,
      });
    } finally {
      setLoading(false);
    }
  };

  const allTimeSlots = Array.from({ length: 16 }, (_, i) => {
    const hour = 7 + i;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  const timeSlots = allTimeSlots.filter((time) => {
    const [hours, minutes] = time.split(':').map(Number);
    const slotDateTime = new Date(selectedDate);
    slotDateTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const hoursDifference = (slotDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    return hoursDifference >= 24;
  });

  const availableDates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1));

  const selectedPackageData = packages.find((p) => p._id === selectedPackage);

  const formatDateValue = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
            {t('calendar.title')}
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            {t('calendar.subtitle')}
          </p>
        </div>

        {initialLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        ) : packages.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden max-w-2xl mx-auto">
            <div className="relative bg-gradient-to-br from-purple-600 to-indigo-600 p-8">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full -ml-16 -mb-16"></div>
              </div>
              <div className="relative text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {t('calendar.noPackages.title')}
                </h3>
                <p className="text-purple-100">
                  {t('calendar.noPackages.message')}
                </p>
              </div>
            </div>
            <div className="p-8">
              <p className="text-sm font-semibold text-gray-700 mb-4 text-center">
                {t('calendar.noPackages.contactTitle')}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(t('calendar.noPackages.phone'));
                    toast.success('Phone number copied to clipboard!');
                  }}
                  className="w-full flex items-center justify-center gap-2 text-purple-600 hover:text-purple-700 font-semibold transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-lg">{t('calendar.noPackages.phone')}</span>
                </button>
                <p className="text-sm text-gray-500 text-center">or</p>
                <a
                  href="https://line.me/ti/p/~corestudiopilates"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"></path>
                  </svg>
                  {t('calendar.noPackages.lineButton')}
                </a>
              </div>
              <p className="text-xs text-gray-500 text-center mt-6">
                {t('calendar.noPackages.helpText')}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Package & Instructor Selection - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Package Selection */}
              <div className="bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5">
                  <h2 className="text-xl font-bold text-white mb-1">{t('calendar.selectPackage.title')}</h2>
                  <p className="text-purple-100 text-sm">{t('calendar.selectPackage.description')}</p>
                </div>
                <div className="p-6">
                  <select
                    value={selectedPackage}
                    onChange={(e) => setSelectedPackage(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-base"
                    required
                  >
                    {packages.map((pkg) => (
                      <option key={pkg._id} value={pkg._id}>
                        {pkg.name} - {pkg.type.charAt(0).toUpperCase() + pkg.type.slice(1)} ({pkg.remainingUnbooked ?? pkg.availableForBooking ?? pkg.remainingSessions} {t('calendar.selectPackage.available')})
                      </option>
                    ))}
                  </select>

                  {selectedPackageData && (
                    <div className="mt-6 p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700 text-sm">{t('calendar.selectPackage.packageType')}</span>
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold capitalize">
                          {selectedPackageData.type}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-3 bg-white rounded-xl shadow-sm">
                          <div className="text-xs text-gray-500 mb-1">{t('calendar.selectPackage.completed')}</div>
                          <div className="text-xl font-bold text-gray-900">{selectedPackageData.completedCount ?? 0}</div>
                        </div>
                        <div className="text-center p-3 bg-white rounded-xl shadow-sm">
                          <div className="text-xs text-gray-500 mb-1">{t('calendar.selectPackage.upcoming')}</div>
                          <div className="text-xl font-bold text-blue-600">{selectedPackageData.upcomingCount ?? 0}</div>
                        </div>
                        <div className="text-center p-3 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-md">
                          <div className="text-xs text-purple-100 mb-1">{t('calendar.selectPackage.remaining')}</div>
                          <div className="text-xl font-bold text-white">{selectedPackageData.remainingUnbooked ?? selectedPackageData.availableForBooking ?? selectedPackageData.remainingSessions}</div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 pt-3 border-t border-gray-200">
                        <span className="text-xs text-gray-600">
                          {t('calendar.selectPackage.total')} {selectedPackageData.totalSessions} {t('calendar.selectPackage.sessions')}
                        </span>
                        <span className="text-xs font-semibold text-gray-700">
                          {t('calendar.selectPackage.validUntil')} {formatStudioTime(selectedPackageData.validTo, 'PPP')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Instructor Selection */}
              <div className="bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5">
                  <h2 className="text-xl font-bold text-white mb-1">{t('calendar.selectInstructor.title')}</h2>
                  <p className="text-purple-100 text-sm">{t('calendar.selectInstructor.description')}</p>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {teachers.map((teacher) => (
                      <div
                        key={teacher._id}
                        onClick={() => setSelectedTeacher(teacher._id)}
                        className={`p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                          selectedTeacher === teacher._id
                            ? 'border-purple-600 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-md'
                            : 'border-gray-200 hover:border-purple-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {selectedTeacher === teacher._id && (
                            <div className="flex-shrink-0">
                              <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="font-bold text-base text-gray-900">{teacher.userId?.name}</div>
                            {teacher.specialties && teacher.specialties.length > 0 && (
                              <div className="text-xs text-gray-600 mt-0.5">
                                {teacher.specialties.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Date & Time Selection */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-6">
                <h2 className="text-2xl font-bold text-white mb-1">{t('calendar.selectDateTime.title')}</h2>
                <p className="text-purple-100 text-sm">{t('calendar.selectDateTime.description')}</p>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-3">{t('calendar.selectDateTime.dateLabel')}</label>
                  <select
                    value={formatDateValue(selectedDate)}
                    onChange={(e) => {
                      const [year, month, day] = e.target.value.split('-').map(Number);
                      setSelectedDate(new Date(year, month - 1, day));
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-base"
                    required
                  >
                    {availableDates.map((date) => (
                      <option key={formatDateValue(date)} value={formatDateValue(date)}>
                        {formatStudioTime(date, 'EEEE, MMMM d, yyyy')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-3">{t('calendar.selectDateTime.timeLabel')}</label>
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {timeSlots.map((time) => {
                      const isBlocked = blockedSlots.has(time);
                      const isPartial = partialSlots.has(time);
                      const details = bookingDetails.get(time);
                      const hasBookings = details && details.bookings && details.bookings.length > 0;

                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => !isBlocked && setSelectedTime(time)}
                          disabled={isBlocked}
                          className={`relative px-3 py-3 border-2 rounded-xl text-sm font-semibold transition-all group ${
                            isBlocked
                              ? 'border-red-300 bg-red-100 text-red-600 cursor-not-allowed'
                              : selectedTime === time
                              ? 'border-purple-600 bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-md'
                              : isPartial
                              ? 'border-yellow-300 bg-yellow-50 text-yellow-700 hover:border-yellow-400 hover:shadow-sm'
                              : 'border-green-300 bg-green-50 text-green-700 hover:border-green-400 hover:shadow-sm'
                          }`}
                        >
                          {isBlocked ? (
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-xs">🔒</span>
                              <span className="line-through text-xs">{time}</span>
                            </div>
                          ) : isPartial ? (
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-xs">⚠️</span>
                              <span className="text-xs">{time}</span>
                            </div>
                          ) : (
                            <span>{time}</span>
                          )}

                          {/* Tooltip */}
                          {(isBlocked || isPartial || hasBookings) && (() => {
                            const relevantBookings = details?.bookings?.filter((b: any) => b.type !== 'blocked') || [];
                            const hasRelevantBookings = relevantBookings.length > 0;

                            if (!hasRelevantBookings && !isBlocked && !isPartial) {
                              return null;
                            }

                            const selectedPkg = packages.find((p) => p._id === selectedPackage);
                            const myPackageType = selectedPkg?.type || 'private';

                            let statusMessage = '';
                            let statusColor = '';

                            if (details?.status === 'blocked') {
                              if (isBlocked) {
                                statusMessage = details.blockReason || t('calendar.tooltip.fullyBooked');
                                statusColor = 'text-red-300';
                              }
                            } else if (isPartial) {
                              if (myPackageType === 'group') {
                                statusMessage = t('calendar.tooltip.cannotBookGroup');
                                statusColor = 'text-yellow-300';
                              } else {
                                statusMessage = t('calendar.tooltip.canBookPrivateDuo');
                                statusColor = 'text-green-300';
                              }
                            }

                            return (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-xl max-w-xs">
                                {hasRelevantBookings || details?.blockReason ? (
                                  <>
                                    {statusMessage && (
                                      <div className={`font-semibold mb-1 ${statusColor}`}>
                                        {statusMessage}
                                      </div>
                                    )}
                                    {relevantBookings.length > 0 && (
                                      <div className="text-xs text-gray-300 mb-1">{t('calendar.tooltip.otherBookings')}</div>
                                    )}
                                    {relevantBookings.map((booking: any, idx: number) => (
                                      <div key={idx} className="text-xs">
                                        {t('calendar.tooltip.teacher')} {booking.teacherName} - {
                                          booking.type === 'private' ? t('packages.private') :
                                          booking.type === 'group' ? t('packages.group') :
                                          booking.type === 'duo' ? t('packages.duo') :
                                          booking.type || 'N/A'
                                        }
                                      </div>
                                    ))}
                                  </>
                                ) : (
                                  <div>{t('calendar.tooltip.noInfo')}</div>
                                )}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                  <div className="border-4 border-transparent border-t-gray-900"></div>
                                </div>
                              </div>
                            );
                          })()}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🟢</span>
                        <span className="text-gray-700">{t('calendar.selectDateTime.legend.green')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🟡</span>
                        <span className="text-gray-700">{t('calendar.selectDateTime.legend.yellow')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🔴</span>
                        <span className="text-gray-700">{t('calendar.selectDateTime.legend.red')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-6">
                <h2 className="text-2xl font-bold text-white mb-1">{t('calendar.notes.title')}</h2>
                <p className="text-purple-100 text-sm">{t('calendar.notes.description')}</p>
              </div>
              <div className="p-8">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all resize-none"
                  placeholder={t('calendar.notes.placeholder')}
                />
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full py-6 text-lg font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-2xl shadow-lg hover:shadow-xl transition-all"
              size="lg"
              disabled={loading}
            >
              {loading ? t('calendar.submit.submitting') : t('calendar.submit.button')}
            </Button>
          </form>
        )}
      </div>

      <Toaster position="top-right" />
    </div>
  );
}
