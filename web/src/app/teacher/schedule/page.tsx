'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
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
  const { t } = useTranslation('teacher');
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
    return <div className="container mx-auto px-4 py-6 md:py-8">{t('schedule.loading')}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">{t('schedule.title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">{t('schedule.upcomingSessions')}</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <p className="text-gray-500 text-sm md:text-base">{t('schedule.noUpcoming')}</p>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {bookings.map((booking) => (
                <div key={booking._id} className="border rounded-lg p-3 md:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm md:text-base">{booking.customerId.userId.name}</p>
                      <p className="text-xs md:text-sm text-gray-600">
                        {formatStudioTime(booking.startTime, 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-xs md:text-sm text-gray-600">
                        {formatStudioTime(booking.startTime, 'p')} -{' '}
                        {formatStudioTime(booking.endTime, 'p')}
                      </p>
                      <p className="text-xs md:text-sm text-gray-500">{t('schedule.type')}: {booking.type}</p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded self-start sm:self-center">
                      {t('schedule.confirmed')}
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
