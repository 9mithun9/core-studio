'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatStudioTime } from '@/lib/date';
import toast, { Toaster } from 'react-hot-toast';

interface Booking {
  _id: string;
  customerId: {
    userId: {
      name: string;
      email: string;
      phone?: string;
    };
    healthNotes?: string;
  };
  packageId?: {
    name: string;
    type: string;
    sessionsRemaining?: number;
    totalSessions?: number;
  };
  startTime: string;
  endTime: string;
  type: string;
  status: string;
  notes?: string;
  sessionNumber?: number;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const [nextSession, setNextSession] = useState<Booking | null>(null);
  const [todaysSessions, setTodaysSessions] = useState<Booking[]>([]);
  const [allTodaySessions, setAllTodaySessions] = useState<Booking[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionFilter, setSessionFilter] = useState<'today' | 'tomorrow' | 'date'>('today');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [timeUntilNext, setTimeUntilNext] = useState<string>('');
  const [stats, setStats] = useState({
    totalCompleted: 0,
    thisWeek: 0,
    thisMonth: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!nextSession) return;

    const updateCountdown = () => {
      const now = new Date();
      const sessionTime = new Date(nextSession.startTime);
      const diff = sessionTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeUntilNext('Session started');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeUntilNext(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeUntilNext(`${hours}h ${minutes}m`);
      } else {
        setTimeUntilNext(`${minutes} minutes`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [nextSession]);

  const fetchDashboardData = async () => {
    try {
      // Fetch all upcoming sessions to find the next one
      const now = new Date();
      const futureResponse: any = await apiClient.get('/teachers/sessions', {
        params: {
          from: now.toISOString(),
          status: 'confirmed,pending',
        },
      });

      const futureSessions = futureResponse.sessions || [];
      console.log('Future sessions:', futureSessions);

      if (futureSessions.length > 0) {
        // Sort by startTime and get the first one
        const sorted = futureSessions.sort((a: Booking, b: Booking) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        setNextSession(sorted[0]);
      }

      // Fetch today's sessions
      const todayResponse: any = await apiClient.get('/teachers/sessions/today');
      console.log('Todays sessions:', todayResponse);
      setTodaysSessions(todayResponse.sessions || []);
      setAllTodaySessions(todayResponse.sessions || []);

      // Fetch ALL sessions and filter for pending on client side
      const allSessionsResponse: any = await apiClient.get('/teachers/sessions');
      const allSessions = allSessionsResponse.sessions || [];
      const pending = allSessions.filter((s: Booking) => s.status === 'pending');
      console.log('Pending requests:', pending);
      setPendingRequests(pending);

      // Calculate stats
      const completedSessions = allSessions.filter((s: Booking) => s.status === 'completed');

      // This week calculation - from Sunday to now
      const thisWeekStart = new Date();
      thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
      thisWeekStart.setHours(0, 0, 0, 0);
      const thisWeekSessions = allSessions.filter((s: Booking) =>
        (s.status === 'confirmed' || s.status === 'completed') &&
        new Date(s.startTime) >= thisWeekStart &&
        new Date(s.startTime) <= now
      );

      // This month calculation - from 1st to now
      const thisMonthStart = new Date();
      thisMonthStart.setDate(1);
      thisMonthStart.setHours(0, 0, 0, 0);
      const thisMonthSessions = allSessions.filter((s: Booking) =>
        (s.status === 'confirmed' || s.status === 'completed') &&
        new Date(s.startTime) >= thisMonthStart &&
        new Date(s.startTime) <= now
      );

      setStats({
        totalCompleted: completedSessions.length,
        thisWeek: thisWeekSessions.length,
        thisMonth: thisMonthSessions.length,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = async (filter: 'today' | 'tomorrow' | 'date', date?: string) => {
    setSessionFilter(filter);

    if (filter === 'today') {
      const today = new Date();
      setSelectedDate(today.toISOString().split('T')[0]);
      setTodaysSessions(allTodaySessions);
    } else if (filter === 'tomorrow') {
      try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setSelectedDate(tomorrow.toISOString().split('T')[0]);
        const response: any = await apiClient.get('/teachers/sessions', {
          params: {
            from: new Date(tomorrow.setHours(0, 0, 0, 0)).toISOString(),
            to: new Date(tomorrow.setHours(23, 59, 59, 999)).toISOString(),
          },
        });
        setTodaysSessions(response.sessions || []);
      } catch (error) {
        console.error('Failed to fetch tomorrow sessions:', error);
        toast.error('Failed to load tomorrow sessions');
      }
    } else if (filter === 'date' && date) {
      setSelectedDate(date);
      try {
        const selectedDay = new Date(date);
        const response: any = await apiClient.get('/teachers/sessions', {
          params: {
            from: new Date(selectedDay.setHours(0, 0, 0, 0)).toISOString(),
            to: new Date(selectedDay.setHours(23, 59, 59, 999)).toISOString(),
          },
        });
        setTodaysSessions(response.sessions || []);
      } catch (error) {
        console.error('Failed to fetch sessions for selected date:', error);
        toast.error('Failed to load sessions');
      }
    }
  };

  const canCancelSession = (startTime: string) => {
    const sessionTime = new Date(startTime);
    const now = new Date();
    const hoursUntilSession = (sessionTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilSession >= 3;
  };

  const handleCancelSession = async (bookingId: string, startTime: string) => {
    if (!canCancelSession(startTime)) {
      toast.error('Cannot cancel sessions less than 3 hours before start time');
      return;
    }

    const reason = prompt('Please provide a reason for cancellation (this will be sent to the customer):');
    if (reason === null) {
      // User clicked cancel
      return;
    }

    const loadingToast = toast.loading('Cancelling session...');
    try {
      await apiClient.patch(`/bookings/${bookingId}`, {
        status: 'cancelled',
        cancellationReason: reason || 'No reason provided'
      });
      toast.success('Session cancelled successfully. Customer has been notified.', { id: loadingToast });
      fetchDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to cancel session', { id: loadingToast });
    }
  };

  const handleApproveRequest = async (bookingId: string) => {
    const loadingToast = toast.loading('Approving request...');
    try {
      await apiClient.patch(`/bookings/${bookingId}/confirm`);
      toast.success('Booking request approved', { id: loadingToast });
      fetchDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve request', { id: loadingToast });
    }
  };

  const handleRejectRequest = async (bookingId: string) => {
    if (!confirm('Are you sure you want to reject this booking request?')) {
      return;
    }

    const loadingToast = toast.loading('Rejecting request...');
    try {
      await apiClient.patch(`/bookings/${bookingId}/reject`);
      toast.success('Booking request rejected', { id: loadingToast });
      fetchDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject request', { id: loadingToast });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-orange-600 bg-orange-100';
      case 'confirmed':
        return 'text-green-600 bg-green-100';
      case 'completed':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading dashboard...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.totalCompleted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.thisWeek}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.thisMonth}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-1 space-y-6">
          {/* Next Session */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Next Session</CardTitle>
            </CardHeader>
            <CardContent>
              {nextSession ? (
                <div>
                  <div className="text-2xl font-bold text-primary-600 mb-1">
                    {formatStudioTime(nextSession.startTime, 'EEEE, MMM d')}
                  </div>
                  <div className="text-xl font-semibold mb-2">
                    {formatStudioTime(nextSession.startTime, 'h:mm a')} with {nextSession.customerId.userId.name}
                  </div>

                  {timeUntilNext && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-sm text-blue-600 font-medium">Starts in</div>
                      <div className="text-2xl font-bold text-blue-700">{timeUntilNext}</div>
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(nextSession.status)}`}>
                      {nextSession.status}
                    </span>
                    <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700 capitalize">
                      {nextSession.type}
                    </span>
                  </div>

                  {nextSession.packageId && (
                    <div className="mt-3 text-sm text-gray-600">
                      {nextSession.packageId.name} - {nextSession.packageId.type}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">No upcoming sessions</p>
              )}
            </CardContent>
          </Card>

          {/* Pending Booking Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pending Requests ({pendingRequests.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3">
                <button
                  onClick={() => router.push('/teacher/session-requests')}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium hover:underline cursor-pointer"
                >
                  View All Requests →
                </button>
              </div>
              {pendingRequests.length === 0 ? (
                <p className="text-gray-500">No pending requests</p>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.slice(0, 3).map((request) => (
                    <div key={request._id} className="border border-orange-200 bg-orange-50 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{request.customerId.userId.name}</p>
                          <p className="text-sm text-gray-600">{request.customerId.userId.email}</p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 mb-3">
                        <div className="font-medium text-orange-600">
                          {formatStudioTime(request.startTime, 'EEE, MMM d')} at {formatStudioTime(request.startTime, 'h:mm a')}
                        </div>
                      </div>
                      {request.notes && (
                        <p className="text-xs text-gray-600 mb-3">
                          <span className="font-medium">Notes:</span> {request.notes}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveRequest(request._id)}
                          className="flex-1 text-xs py-1 h-8"
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectRequest(request._id)}
                          className="flex-1 text-xs py-1 h-8"
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN - Today's Sessions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-3">
                <CardTitle className="text-xl">Sessions</CardTitle>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => handleFilterChange('today')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      sessionFilter === 'today'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => handleFilterChange('tomorrow')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      sessionFilter === 'tomorrow'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Tomorrow
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleFilterChange('date', e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
              <div className="text-3xl font-bold text-primary-600">
                {todaysSessions.length} {todaysSessions.length === 1 ? 'Session' : 'Sessions'}
              </div>
            </CardHeader>
            <CardContent>
              {todaysSessions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No sessions scheduled for today</p>
                  <p className="text-gray-400 text-sm mt-2">Enjoy your free day!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {todaysSessions.map((session) => (
                    <div key={session._id} className="border-2 border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all hover:border-primary-300 bg-white">
                      {/* Header Section */}
                      <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-100">
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-gray-900 mb-1">
                            {session.customerId.userId.name}
                          </h4>
                          <div className="flex flex-col gap-1 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {session.customerId.userId.email}
                            </div>
                            {session.customerId.userId.phone && (
                              <a
                                href={`https://line.me/ti/p/~${session.customerId.userId.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:underline transition-colors"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                                </svg>
                                {session.customerId.userId.phone}
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary-600">
                            {formatStudioTime(session.startTime, 'h:mm a')}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatStudioTime(session.startTime, 'MMM d, yyyy')}
                          </div>
                        </div>
                      </div>

                      {/* Session Info */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusColor(session.status)}`}>
                          {session.status}
                        </span>
                        <span className="inline-block px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 capitalize">
                          {session.type}
                        </span>
                        {session.packageId && (
                          <>
                            <span className="inline-block px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                              {session.packageId.name}
                            </span>
                            {session.packageId.sessionsRemaining !== undefined && (
                              <span className="inline-block px-3 py-1.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                {session.packageId.sessionsRemaining} sessions remaining
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Notes Section */}
                      {session.notes && (
                        <div className="mb-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r text-sm">
                          <div className="flex items-start gap-2">
                            <svg className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <div className="flex-1">
                              <span className="font-semibold text-blue-800">Booking Notes:</span>
                              <p className="text-blue-700 mt-1">{session.notes}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Health Notes */}
                      {session.customerId.healthNotes && (
                        <div className="mb-3 p-3 bg-orange-50 border-l-4 border-orange-400 rounded-r text-sm">
                          <div className="flex items-start gap-2">
                            <span className="text-lg">⚠️</span>
                            <div className="flex-1">
                              <span className="font-semibold text-orange-800">Health Notes:</span>
                              <p className="text-orange-700 mt-1">{session.customerId.healthNotes}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Cancel Button */}
                      {session.status !== 'cancelled' && canCancelSession(session.startTime) && (
                        <div className="pt-4 border-t border-gray-100 flex justify-end">
                          <button
                            onClick={() => handleCancelSession(session._id, session.startTime)}
                            className="px-6 py-2 text-sm font-medium text-red-600 hover:text-red-700 border-2 border-red-300 hover:border-red-400 rounded-lg hover:bg-red-50 transition-all"
                          >
                            Cancel Session
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Toaster position="top-right" />
    </div>
  );
}
