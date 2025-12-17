'use client';

import { useEffect, useState } from 'react';
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
    return <div className="container mx-auto px-4 py-8">Loading sessions...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Session Management</h1>
        <p className="text-gray-600">
          Manage your sessions, mark them as complete or no-show
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Button
              variant={filter === 'pending-decision' ? 'default' : 'outline'}
              onClick={() => setFilter('pending-decision')}
            >
              Pending Decision
              {filter === 'pending-decision' && sessions.length > 0 && (
                <span className="ml-2 bg-white text-primary-600 px-2 py-0.5 rounded-full text-xs font-bold">
                  {sessions.length}
                </span>
              )}
            </Button>
            <Button
              variant={filter === 'today' ? 'default' : 'outline'}
              onClick={() => setFilter('today')}
            >
              Today's Sessions
            </Button>
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              All Confirmed Sessions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">
              {filter === 'pending-decision'
                ? 'No sessions pending decision. Great job!'
                : filter === 'today'
                ? 'No sessions scheduled for today'
                : 'No confirmed sessions found'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const isPast = isPastSession(session);
            const isProcessing = processingId === session._id;

            return (
              <Card
                key={session._id}
                className={isPast ? 'border-orange-200 bg-orange-50' : ''}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">
                          {session.customerId.userId.name}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded text-xs font-medium ${
                            isPast
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {isPast ? 'Needs Decision' : 'Upcoming'}
                        </span>
                        <span className="px-3 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                          {session.type}
                        </span>
                      </div>

                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <strong>Date:</strong> {formatStudioTime(session.startTime, 'PPP')}
                        </p>
                        <p>
                          <strong>Time:</strong> {formatStudioTime(session.startTime, 'p')} -{' '}
                          {formatStudioTime(session.endTime, 'p')}
                        </p>
                        <p>
                          <strong>Email:</strong> {session.customerId.userId.email}
                        </p>
                        {session.packageId && (
                          <p>
                            <strong>Package:</strong> {session.packageId.name} (
                            {session.packageId.type})
                          </p>
                        )}
                        {session.notes && (
                          <p>
                            <strong>Notes:</strong> {session.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {isPast && (
                      <div className="flex gap-3">
                        <Button
                          onClick={() => handleMarkComplete(session._id)}
                          disabled={isProcessing}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isProcessing ? 'Processing...' : 'Mark Complete'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleMarkNoShow(session._id)}
                          disabled={isProcessing}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          {isProcessing ? 'Processing...' : 'Mark No-Show'}
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
