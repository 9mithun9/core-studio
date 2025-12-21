'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { apiClient } from '@/lib/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatStudioTime } from '@/lib/date';
import toast, { Toaster } from 'react-hot-toast';

interface Booking {
  _id: string;
  customerId: {
    userId: {
      name: string;
      email: string;
    };
  };
  startTime: string;
  endTime: string;
  type: string;
  status: string;
  notes?: string;
  packageId?: {
    name: string;
    type: string;
  };
}

type FilterType = 'all' | 'today' | 'pending-decision';

export default function TeacherSessionsPage() {
  const { t } = useTranslation('teacher');
  const [sessions, setSessions] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('pending-decision');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, [filter]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const teacherResponse: any = await apiClient.get('/teachers/me');
      const teacherId = teacherResponse.teacher._id;

      let params: any = {
        teacherId,
      };

      if (filter === 'today') {
        // Today's sessions
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        params.from = today.toISOString();
        params.to = tomorrow.toISOString();
        params.status = 'confirmed';
      } else if (filter === 'pending-decision') {
        // All past confirmed sessions (that need to be marked as complete or no-show)
        const now = new Date();
        params.to = now.toISOString();
        params.status = 'confirmed';
      } else {
        // All confirmed sessions
        params.status = 'confirmed';
      }

      const response: any = await apiClient.get('/bookings', { params });
      const bookings = response.bookings || [];

      // Sort by date (newest first for pending decisions, oldest first for others)
      const sorted = bookings.sort((a: Booking, b: Booking) => {
        const dateA = new Date(a.startTime).getTime();
        const dateB = new Date(b.startTime).getTime();
        return filter === 'pending-decision' ? dateB - dateA : dateA - dateB;
      });

      setSessions(sorted);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async (bookingId: string) => {
    if (!confirm('Mark this session as completed?')) return;

    setProcessingId(bookingId);
    const loadingToast = toast.loading('Marking session as complete...');

    try {
      await apiClient.patch(`/bookings/${bookingId}/complete`);
      toast.success('Session marked as completed!', { id: loadingToast });
      fetchSessions();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to mark session as complete', {
        id: loadingToast,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkNoShow = async (bookingId: string) => {
    if (!confirm('Mark this session as no-show? This will cancel the session.')) return;

    setProcessingId(bookingId);
    const loadingToast = toast.loading('Marking session as no-show...');

    try {
      await apiClient.patch(`/bookings/${bookingId}/no-show`);
      toast.success('Session marked as no-show!', { id: loadingToast });
      fetchSessions();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to mark session as no-show', {
        id: loadingToast,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const isPastSession = (session: Booking) => {
    return new Date(session.endTime) < new Date();
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-6 md:py-8">{t('sessions.loading')}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">{t('sessions.title')}</h1>
        <p className="text-gray-600 text-xs md:text-sm">
          {t('sessions.subtitle')}
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-4 md:mb-6">
        <CardContent className="pt-4 md:pt-6">
          <div className="flex flex-wrap gap-2 md:gap-3">
            <Button
              variant={filter === 'pending-decision' ? 'default' : 'outline'}
              onClick={() => setFilter('pending-decision')}
              size="sm"
            >
              <span className="text-xs md:text-sm">{t('sessions.pending_decision')}</span>
              {filter === 'pending-decision' && sessions.length > 0 && (
                <span className="ml-2 bg-white text-primary-600 px-2 py-0.5 rounded-full text-xs font-bold">
                  {sessions.length}
                </span>
              )}
            </Button>
            <Button
              variant={filter === 'today' ? 'default' : 'outline'}
              onClick={() => setFilter('today')}
              size="sm"
            >
              <span className="text-xs md:text-sm">{t('sessions.todays_sessions')}</span>
            </Button>
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              size="sm"
            >
              <span className="text-xs md:text-sm">{t('sessions.all_confirmed')}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 text-sm md:text-base">
              {filter === 'pending-decision'
                ? t('sessions.no_pending')
                : filter === 'today'
                ? t('sessions.no_today')
                : t('sessions.no_confirmed')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {sessions.map((session) => {
            const isPast = isPastSession(session);
            const isProcessing = processingId === session._id;

            return (
              <Card
                key={session._id}
                className={isPast ? 'border-orange-200 bg-orange-50' : ''}
              >
                <CardContent className="pt-4 md:pt-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                        <h3 className="text-base md:text-lg font-semibold">
                          {session.customerId.userId.name}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded text-xs font-medium ${
                            isPast
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {isPast ? t('sessions.needs_decision') : t('sessions.upcoming')}
                        </span>
                        <span className="px-3 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                          {session.type}
                        </span>
                      </div>

                      <div className="text-xs md:text-sm text-gray-600 space-y-1">
                        <p>
                          <strong>{t('sessions.date')}:</strong> {formatStudioTime(session.startTime, 'PPP')}
                        </p>
                        <p>
                          <strong>{t('sessions.time')}:</strong> {formatStudioTime(session.startTime, 'p')} -{' '}
                          {formatStudioTime(session.endTime, 'p')}
                        </p>
                        <p>
                          <strong>{t('sessions.email')}:</strong> {session.customerId.userId.email}
                        </p>
                        {session.packageId && (
                          <p>
                            <strong>{t('sessions.package')}:</strong> {session.packageId.name} (
                            {session.packageId.type})
                          </p>
                        )}
                        {session.notes && (
                          <p>
                            <strong>{t('sessions.notes')}:</strong> {session.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {isPast && (
                      <div className="flex flex-col sm:flex-row gap-3 lg:flex-shrink-0">
                        <Button
                          onClick={() => handleMarkComplete(session._id)}
                          disabled={isProcessing}
                          className="bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          <span className="text-xs md:text-sm">{isProcessing ? t('sessions.processing') : t('sessions.mark_complete')}</span>
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleMarkNoShow(session._id)}
                          disabled={isProcessing}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          size="sm"
                        >
                          <span className="text-xs md:text-sm">{isProcessing ? t('sessions.processing') : t('sessions.mark_no_show')}</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Toaster position="top-right" />
    </div>
  );
}
