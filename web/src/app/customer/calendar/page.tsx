'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatStudioTime, isValidBookingTime } from '@/lib/date';
import { addDays, addHours, setHours, setMinutes, startOfDay } from 'date-fns';

export default function CustomerCalendar() {
  const [packages, setPackages] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(addDays(new Date(), 2)); // Default to 2 days ahead
  const [selectedTime, setSelectedTime] = useState<string>('09:00');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadPackages();
    loadTeachers();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Parse selected date and time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const desiredDateTime = setMinutes(setHours(selectedDate, hours), minutes);

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
      await apiClient.post('/bookings/request', {
        teacherId: selectedTeacher,
        desiredTime: desiredDateTime.toISOString(),
        type: 'private', // You can add type selection if needed
        packageId: selectedPackage,
        notes,
      });

      setSuccess(
        'Booking request submitted successfully! You will receive confirmation via LINE shortly.'
      );

      // Reset form
      setNotes('');
      setSelectedDate(addDays(new Date(), 2));
      setSelectedTime('09:00');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit booking request');
    } finally {
      setLoading(false);
    }
  };

  // Generate time slots (9 AM to 8 PM, hourly)
  const timeSlots = Array.from({ length: 12 }, (_, i) => {
    const hour = 9 + i;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  // Generate next 14 days
  const availableDates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i + 1));

  const selectedPackageData = packages.find((p) => p._id === selectedPackage);

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
                    {pkg.name} ({pkg.remainingSessions} sessions left)
                  </option>
                ))}
              </select>

              {selectedPackageData && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md text-sm space-y-1">
                  <div>
                    <span className="font-medium">Sessions remaining:</span>{' '}
                    {selectedPackageData.remainingSessions}
                  </div>
                  <div>
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
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(new Date(e.target.value + 'T00:00:00'))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  {availableDates.map((date) => (
                    <option key={date.toISOString()} value={date.toISOString().split('T')[0]}>
                      {formatStudioTime(date, 'EEEE, MMMM d, yyyy')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Time</label>
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSelectedTime(time)}
                      className={`px-3 py-2 border rounded-md text-sm transition ${
                        selectedTime === time
                          ? 'border-primary-600 bg-primary-600 text-white'
                          : 'border-gray-300 hover:border-primary-300'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
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
