'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatStudioTime, isValidBookingTime, createStudioDateTime } from '@/lib/date';
import { addDays, startOfDay } from 'date-fns';

export default function CustomerCalendar() {
  const [packages, setPackages] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(addDays(new Date(), 2)); // Default to 2 days ahead
  const [selectedTime, setSelectedTime] = useState<string>(''); // No default time selected
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
      setPackages(data.packages.filter((p: any) => p.status === 'active'));
      if (data.packages.length > 0) {
        setSelectedPackage(data.packages[0]._id);
      }
    } catch (err) {
      console.error('Failed to load packages', err);
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
      // Fetch all bookings for the selected teacher on the selected date
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

      // Get the selected package type to check compatibility
      const selectedPkg = packages.find((p) => p._id === selectedPackage);
      const myPackageType = selectedPkg?.type || 'private';

      // Process each slot from the backend
      slots.forEach((slot: any) => {
        const slotStart = new Date(slot.startTime);
        const startHour = slotStart.getHours();
        const time = `${startHour.toString().padStart(2, '0')}:00`;

        // Store full slot data
        availability.set(time, slot);

        // Determine if this slot is blocked or partial based on status and allowed types
        if (slot.status === 'blocked') {
          blocked.add(time);
        } else if (slot.status === 'partial') {
          // Check if my package type is allowed in this partial slot
          if (slot.allowedTypes && slot.allowedTypes.includes(myPackageType)) {
            partial.add(time);
          } else {
            blocked.add(time);
          }
        }
        // If status is 'available', don't add to blocked or partial

        // Store booking details for tooltip
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
    setError('');
    setSuccess('');

    if (!selectedTime) {
      setError('Please select a time slot');
      return;
    }

    // Check if time slot is blocked
    if (blockedSlots.has(selectedTime)) {
      setError('This time slot is already booked. Please select another time.');
      return;
    }

    // Parse selected date and time in studio timezone
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const desiredDateTime = createStudioDateTime(selectedDate, hours, minutes);

    // Check 24-hour rule
    if (!isValidBookingTime(desiredDateTime, 24)) {
      setError(
        'Bookings must be requested at least 24 hours in advance. For urgent bookings, please contact us via LINE.'
      );
      return;
    }

    if (!selectedTeacher) {
      setError('Please select an instructor');
      return;
    }

    if (!selectedPackage) {
      setError('Please select a package');
      return;
    }

    setLoading(true);

    try {
      // Get the selected package type
      const selectedPkg = packages.find((p) => p._id === selectedPackage);
      const packageType = selectedPkg?.type || 'private';

      await apiClient.post('/bookings/request', {
        teacherId: selectedTeacher,
        desiredTime: desiredDateTime.toISOString(),
        type: packageType,
        packageId: selectedPackage,
        notes,
      });

      setSuccess(
        'Booking request submitted successfully! You will receive confirmation via LINE shortly.'
      );

      // Reset form
      setNotes('');
      setSelectedDate(addDays(new Date(), 2));
      setSelectedTime('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit booking request');
    } finally {
      setLoading(false);
    }
  };

  // Generate time slots (7 AM to 10 PM, hourly) - Studio closes at 11 PM
  // Filter out slots less than 24 hours away for the selected date
  const allTimeSlots = Array.from({ length: 16 }, (_, i) => {
    const hour = 7 + i;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  // Filter time slots based on 24-hour advance booking rule
  const timeSlots = allTimeSlots.filter((time) => {
    const [hours, minutes] = time.split(':').map(Number);
    const slotDateTime = new Date(selectedDate);
    slotDateTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const hoursDifference = (slotDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Only show slots that are at least 24 hours away
    return hoursDifference >= 24;
  });

  // Generate next 14 days
  const availableDates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1));

  const selectedPackageData = packages.find((p) => p._id === selectedPackage);

  // Helper function to format date as YYYY-MM-DD in local timezone
  const formatDateValue = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Book a Session</h1>
        <p className="text-gray-600 mt-2">
          Request a session at least 24 hours in advance
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {packages.length === 0 ? (
        <Card className="bg-gradient-to-br from-primary-50 to-white border-2 border-primary-200">
          <CardContent className="py-16 text-center">
            <div className="max-w-md mx-auto">
              {/* Icon */}
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto bg-primary-100 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>

              {/* Message */}
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Ready to Start Your Journey?
              </h3>
              <p className="text-gray-600 mb-6">
                You don't have any active packages yet. Get started with a package that fits your goals and schedule!
              </p>

              {/* Contact Info */}
              <div className="bg-white rounded-lg p-6 mb-6 border border-primary-200">
                <p className="text-sm font-medium text-gray-700 mb-4">Contact us to purchase a package:</p>
                <div className="space-y-3">
                  <a
                    href="tel:+1234567890"
                    className="flex items-center justify-center gap-2 text-primary-600 hover:text-primary-700 font-semibold"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-lg">+1 (234) 567-890</span>
                  </a>
                  <p className="text-sm text-gray-500">or</p>
                  <a
                    href="https://line.me/ti/p/~corestudiopilates"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"></path>
                    </svg>
                    Contact us on LINE
                  </a>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Our team will help you choose the perfect package to achieve your fitness goals!
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Package Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Package</CardTitle>
              <CardDescription>Choose which package to use for this session</CardDescription>
            </CardHeader>
            <CardContent>
              <select
                value={selectedPackage}
                onChange={(e) => setSelectedPackage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                {packages.map((pkg) => (
                  <option key={pkg._id} value={pkg._id}>
                    {pkg.name} - {pkg.type.charAt(0).toUpperCase() + pkg.type.slice(1)} ({pkg.remainingUnbooked ?? pkg.availableForBooking ?? pkg.remainingSessions} available)
                  </option>
                ))}
              </select>

              {selectedPackageData && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md text-sm space-y-1">
                  <div>
                    <span className="font-medium">Package Type:</span>{' '}
                    <span className="capitalize">{selectedPackageData.type}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2 mb-2">
                    <div className="text-center p-2 bg-white rounded">
                      <div className="text-xs text-gray-500">Completed</div>
                      <div className="font-semibold">{selectedPackageData.completedCount ?? 0}</div>
                    </div>
                    <div className="text-center p-2 bg-white rounded">
                      <div className="text-xs text-gray-500">Upcoming</div>
                      <div className="font-semibold text-blue-600">{selectedPackageData.upcomingCount ?? 0}</div>
                    </div>
                    <div className="text-center p-2 bg-primary-100 rounded">
                      <div className="text-xs text-primary-700">Remaining</div>
                      <div className="font-bold text-primary-600">{selectedPackageData.remainingUnbooked ?? selectedPackageData.availableForBooking ?? selectedPackageData.remainingSessions}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Total: {selectedPackageData.totalSessions} sessions
                  </div>
                  <div className="pt-2 border-t">
                    <span className="font-medium">Valid until:</span>{' '}
                    {formatStudioTime(selectedPackageData.validTo, 'PPP')}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructor Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Instructor</CardTitle>
              <CardDescription>Choose your preferred instructor</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teachers.map((teacher) => (
                  <div
                    key={teacher._id}
                    onClick={() => setSelectedTeacher(teacher._id)}
                    className={`p-4 border rounded-lg cursor-pointer transition ${
                      selectedTeacher === teacher._id
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-300 hover:border-primary-300'
                    }`}
                  >
                    <div className="font-medium">{teacher.userId?.name}</div>
                    {teacher.specialties && teacher.specialties.length > 0 && (
                      <div className="text-sm text-gray-600 mt-1">
                        {teacher.specialties.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Date & Time Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Date & Time</CardTitle>
              <CardDescription>
                Choose a date and time (must be at least 24 hours in advance)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <select
                  value={formatDateValue(selectedDate)}
                  onChange={(e) => {
                    const [year, month, day] = e.target.value.split('-').map(Number);
                    setSelectedDate(new Date(year, month - 1, day));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                <label className="block text-sm font-medium mb-2">Time</label>
                <div className="grid grid-cols-4 gap-2">
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
                        className={`px-3 py-2 border rounded-md text-sm transition relative group ${
                          isBlocked
                            ? 'border-red-300 bg-red-100 text-red-600 cursor-not-allowed'
                            : selectedTime === time
                            ? 'border-primary-600 bg-primary-600 text-white'
                            : isPartial
                            ? 'border-yellow-300 bg-yellow-100 text-yellow-700 hover:border-yellow-400'
                            : 'border-green-300 bg-green-50 text-green-700 hover:border-green-400'
                        }`}
                      >
                        {isBlocked ? (
                          <div className="flex items-center justify-center gap-1">
                            <span>🔒</span>
                            <span className="line-through">{time}</span>
                          </div>
                        ) : isPartial ? (
                          <div className="flex items-center justify-center gap-1">
                            <span>⚠️</span>
                            <span>{time}</span>
                          </div>
                        ) : (
                          time
                        )}

                        {/* Custom tooltip for blocked and partial slots */}
                        {(isBlocked || isPartial || hasBookings) && (() => {
                          // Filter out BLOCKED bookings from other teachers - they're not relevant
                          const relevantBookings = details?.bookings?.filter((b: any) => b.type !== 'blocked') || [];
                          const hasRelevantBookings = relevantBookings.length > 0;

                          // Only show tooltip if there are relevant bookings OR if the selected teacher is blocked
                          if (!hasRelevantBookings && !isBlocked && !isPartial) {
                            return null;
                          }

                          // Get the selected package type to provide context-aware messages
                          const selectedPkg = packages.find((p) => p._id === selectedPackage);
                          const myPackageType = selectedPkg?.type || 'private';

                          // Determine the appropriate message based on slot status and package type
                          let statusMessage = '';
                          let statusColor = '';

                          if (details?.status === 'blocked') {
                            if (isBlocked) {
                              // Fully blocked for the selected teacher
                              statusMessage = details.blockReason || 'Fully Booked';
                              statusColor = 'text-red-300';
                            }
                          } else if (isPartial) {
                            // Partial availability - check if user's package type is allowed
                            if (myPackageType === 'group') {
                              statusMessage = 'Cannot book GROUP session when another teacher is already booked';
                              statusColor = 'text-yellow-300';
                            } else {
                              statusMessage = 'You can still book this slot (Private/Duo only)';
                              statusColor = 'text-green-300';
                            }
                          }

                          return (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                              {hasRelevantBookings || details?.blockReason ? (
                                <>
                                  {statusMessage && (
                                    <div className={`font-semibold mb-1 ${statusColor}`}>
                                      {statusMessage}
                                    </div>
                                  )}
                                  {relevantBookings.length > 0 && (
                                    <div className="text-xs text-gray-300 mb-1">Other bookings:</div>
                                  )}
                                  {relevantBookings.map((booking: any, idx: number) => (
                                    <div key={idx} className="text-xs">
                                      Teacher: {booking.teacherName} - {
                                        booking.type === 'private' ? 'Private' :
                                        booking.type === 'group' ? 'Group' :
                                        booking.type === 'duo' ? 'Duo' :
                                        booking.type || 'N/A'
                                      }
                                    </div>
                                  ))}
                                </>
                              ) : (
                                <div>No info available</div>
                              )}
                              {/* Arrow */}
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
                <div className="text-xs text-gray-600 mt-2 space-y-1">
                  <p>🟢 Green = Available</p>
                  <p>🟡 Yellow = Partially booked (you can still book)</p>
                  <p>🔴 Red = Fully blocked</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Notes (Optional)</CardTitle>
              <CardDescription>
                Any special requests or information we should know
              </CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="E.g., injuries, specific focus areas, etc."
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Submitting Request...' : 'Request Booking'}
          </Button>

          <p className="text-sm text-gray-500 text-center">
            Your request will be reviewed and you'll receive confirmation via LINE
          </p>
        </form>
      )}
    </div>
  );
}
