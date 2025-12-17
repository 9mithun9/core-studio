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
      const data = await apiClient.get<any>('/packages/me');
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
      const data = await apiClient.get<any>('/teachers');
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

      const response = await apiClient.get('/bookings/availability', {
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
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600 mb-4">
              You don't have any active packages to book sessions
            </p>
            <p className="text-sm text-gray-500">
              Please contact the studio to purchase a package
            </p>
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
