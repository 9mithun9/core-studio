'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatStudioTime } from '@/lib/date';

interface Booking {
  _id: string;
  customerId: {
    userId: {
      name: string;
    };
  };
  startTime: string;
  endTime: string;
  type: string;
  status: string;
}

export default function TeacherSchedule() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const teacherResponse: any = await apiClient.get('/teachers/me');
      const teacherId = teacherResponse.teacher._id;

      const response: any = await apiClient.get('/bookings', {
        params: {
          teacherId,
          status: 'confirmed',
          from: new Date().toISOString(),
        },
      });

      setBookings(response.bookings || []);
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Schedule</h1>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-gray-500">No upcoming sessions</p>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div key={booking._id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{booking.customerId.userId.name}</p>
                      <p className="text-sm text-gray-600">
                        {formatStudioTime(booking.startTime, 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatStudioTime(booking.startTime, 'p')} -{' '}
                        {formatStudioTime(booking.endTime, 'p')}
                      </p>
                      <p className="text-sm text-gray-500">Type: {booking.type}</p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded">
                      Confirmed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
