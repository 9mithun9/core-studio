'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { apiClient } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatStudioTime } from '@/lib/date';
import toast, { Toaster } from 'react-hot-toast';

interface Booking {
  _id: string;
  customerId: {
    _id: string;
    userId: {
      name: string;
      email: string;
      phone?: string;
    };
    healthNotes?: string;
    medicalNotes?: string;
    dateOfBirth?: string;
    height?: number;
    weight?: number;
    gender?: string;
    profilePhoto?: string;
  };
  packageId?: {
    name: string;
    type: string;
    remainingSessions?: number;
    totalSessions?: number;
  };
  startTime: string;
  endTime: string;
  type: string;
  status: string;
  notes?: string;
  sessionNumber?: number;
  hasReview?: boolean;
  review?: any;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const { t } = useTranslation('teacher');
  const [nextSession, setNextSession] = useState<Booking | null>(null);
  const [todaysSessions, setTodaysSessions] = useState<Booking[]>([]);
  const [allTodaySessions, setAllTodaySessions] = useState<Booking[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionFilter, setSessionFilter] = useState<'today' | 'tomorrow' | 'date'>('today');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [timeUntilNext, setTimeUntilNext] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Booking | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentPackages, setStudentPackages] = useState<any[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedSessionForReview, setSelectedSessionForReview] = useState<Booking | null>(null);
  const [reviewRatings, setReviewRatings] = useState({
    control: 0,
    postureAlignment: 0,
    strength: 0,
    flexibilityMobility: 0,
    bodyAwarenessFocus: 0,
  });
  const [reviewNotes, setReviewNotes] = useState('');
  const [stats, setStats] = useState({
    totalCompleted: 0,
    thisWeek: 0,
    thisMonth: 0,
  });

  const calculateAge = (dateOfBirth: string | undefined): number | null => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleStudentClick = async (session: Booking) => {
    setSelectedStudent(session);
    setIsStudentModalOpen(true);

    // Fetch the student's current active packages
    try {
      const response: any = await apiClient.get(`/packages/customer/${session.customerId._id}/view`);
      const activePackages = response.packages?.filter((pkg: any) => pkg.status === 'active') || [];
      setStudentPackages(activePackages);
    } catch (error) {
      console.error('Failed to fetch student packages:', error);
      setStudentPackages([]);
    }
  };

  const handleOpenReviewModal = (session: Booking) => {
    setSelectedSessionForReview(session);
    setIsReviewModalOpen(true);
    // Reset ratings
    setReviewRatings({
      control: 0,
      postureAlignment: 0,
      strength: 0,
      flexibilityMobility: 0,
      bodyAwarenessFocus: 0,
    });
    setReviewNotes('');
  };

  const handleSubmitReview = async () => {
    if (!selectedSessionForReview) return;

    // Check if all ratings are provided
    const ratingValues = Object.values(reviewRatings);
    if (ratingValues.some(rating => rating === 0)) {
      toast.error(t('review.pleaseProvideAllRatings'));
      return;
    }

    const loadingToast = toast.loading(t('review.submitting'));
    try {
      await apiClient.post('/reviews', {
        bookingId: selectedSessionForReview._id,
        ratings: reviewRatings,
        notes: reviewNotes || undefined,
      });
      toast.success(t('review.submitSuccess'), { id: loadingToast });
      setIsReviewModalOpen(false);
      fetchDashboardData(); // Refresh data
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('review.submitError'), { id: loadingToast });
    }
  };

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
        setTimeUntilNext(t('nextSession.started'));
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeUntilNext(`${days}${t('time.days')} ${hours}${t('time.hours')} ${minutes}${t('time.minutes')}`);
      } else if (hours > 0) {
        setTimeUntilNext(`${hours}${t('time.hours')} ${minutes}${t('time.minutes')}`);
      } else {
        setTimeUntilNext(`${minutes} ${t('time.minutesFull')}`);
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
      toast.error(t('errors.loadDashboard'));
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
        toast.error(t('errors.loadSessions'));
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
        toast.error(t('errors.loadSessions'));
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
      toast.error(t('errors.cannotCancel'));
      return;
    }

    const reason = prompt(t('cancellation.reasonPrompt'));
    if (reason === null) {
      // User clicked cancel
      return;
    }

    const loadingToast = toast.loading(t('cancellation.cancelling'));
    try {
      await apiClient.patch(`/bookings/${bookingId}`, {
        status: 'cancelled',
        cancellationReason: reason || t('cancellation.noReason')
      });
      toast.success(t('cancellation.success'), { id: loadingToast });
      fetchDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('cancellation.error'), { id: loadingToast });
    }
  };

  const handleApproveRequest = async (bookingId: string) => {
    const loadingToast = toast.loading(t('requests.approving'));
    try {
      await apiClient.patch(`/bookings/${bookingId}/confirm`);
      toast.success(t('requests.approved'), { id: loadingToast });
      fetchDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('requests.approveError'), { id: loadingToast });
    }
  };

  const handleRejectRequest = async (bookingId: string) => {
    if (!confirm(t('requests.rejectConfirm'))) {
      return;
    }

    const loadingToast = toast.loading(t('requests.rejecting'));
    try {
      await apiClient.patch(`/bookings/${bookingId}/reject`);
      toast.success(t('requests.rejected'), { id: loadingToast });
      fetchDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('requests.rejectError'), { id: loadingToast });
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
    return <div className="p-4 md:p-8 text-center text-sm md:text-base">{t('loading')}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8">{t('dashboard.title')}</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-gray-600">{t('stats.totalCompleted')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-gray-900">{stats.totalCompleted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-gray-600">{t('stats.thisWeek')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-gray-900">{stats.thisWeek}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs md:text-sm font-medium text-gray-600">{t('stats.thisMonth')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-gray-900">{stats.thisMonth}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-1 space-y-4 md:space-y-6">
          {/* Next Session */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">{t('nextSession.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              {nextSession ? (
                <div>
                  <div className="text-lg md:text-2xl font-bold text-primary-600 mb-1">
                    {formatStudioTime(nextSession.startTime, 'EEEE, MMM d')}
                  </div>
                  <div className="text-base md:text-xl font-semibold mb-2">
                    {formatStudioTime(nextSession.startTime, 'h:mm a')} {t('nextSession.with')} {nextSession.customerId.userId.name}
                  </div>

                  {timeUntilNext && (
                    <div className="mt-3 p-2 md:p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-xs md:text-sm text-blue-600 font-medium">{t('nextSession.startsIn')}</div>
                      <div className="text-lg md:text-2xl font-bold text-blue-700">{timeUntilNext}</div>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`inline-block px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium ${getStatusColor(nextSession.status)}`}>
                      {nextSession.status}
                    </span>
                    <span className="inline-block px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium bg-purple-100 text-purple-700 capitalize">
                      {nextSession.type}
                    </span>
                  </div>

                  {nextSession.packageId && (
                    <div className="mt-3 text-xs md:text-sm text-gray-600">
                      {nextSession.packageId.name} - {nextSession.packageId.type}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm md:text-base text-gray-500">{t('nextSession.noUpcoming')}</p>
              )}
            </CardContent>
          </Card>

          {/* Pending Booking Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">{t('requests.title')} ({pendingRequests.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3">
                <button
                  onClick={() => router.push('/teacher/session-requests')}
                  className="text-primary-600 hover:text-primary-700 text-xs md:text-sm font-medium hover:underline cursor-pointer"
                >
                  {t('requests.viewAll')} →
                </button>
              </div>
              {pendingRequests.length === 0 ? (
                <p className="text-sm md:text-base text-gray-500">{t('requests.noPending')}</p>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.slice(0, 3).map((request) => (
                    <div key={request._id} className="border border-orange-200 bg-orange-50 rounded-lg p-2 md:p-3">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                        <div className="flex-1">
                          <p className="text-sm md:text-base font-semibold text-gray-900">{request.customerId.userId.name}</p>
                          <p className="text-xs md:text-sm text-gray-600 break-all">{request.customerId.userId.email}</p>
                        </div>
                      </div>
                      <div className="text-xs md:text-sm text-gray-700 mb-2 md:mb-3">
                        <div className="font-medium text-orange-600">
                          {formatStudioTime(request.startTime, 'EEE, MMM d')} at {formatStudioTime(request.startTime, 'h:mm a')}
                        </div>
                      </div>
                      {request.notes && (
                        <p className="text-xs text-gray-600 mb-2 md:mb-3">
                          <span className="font-medium">{t('requests.notes')}:</span> {request.notes}
                        </p>
                      )}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveRequest(request._id)}
                          className="flex-1 text-xs py-1 h-8"
                        >
                          {t('requests.approve')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectRequest(request._id)}
                          className="flex-1 text-xs py-1 h-8"
                        >
                          {t('requests.reject')}
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <CardTitle className="text-lg md:text-xl">{t('sessions.title')}</CardTitle>
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    onClick={() => handleFilterChange('today')}
                    className={`px-2 md:px-3 py-1 rounded-md text-xs md:text-sm font-medium transition-colors ${
                      sessionFilter === 'today'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {t('sessions.today')}
                  </button>
                  <button
                    onClick={() => handleFilterChange('tomorrow')}
                    className={`px-2 md:px-3 py-1 rounded-md text-xs md:text-sm font-medium transition-colors ${
                      sessionFilter === 'tomorrow'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {t('sessions.tomorrow')}
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleFilterChange('date', e.target.value)}
                    className="px-2 md:px-3 py-1 border border-gray-300 rounded-md text-xs md:text-sm w-full sm:w-auto"
                  />
                </div>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-primary-600">
                {todaysSessions.length} {todaysSessions.length === 1 ? t('sessions.session') : t('sessions.sessions')}
              </div>
            </CardHeader>
            <CardContent>
              {todaysSessions.length === 0 ? (
                <div className="text-center py-8 md:py-12">
                  <p className="text-gray-500 text-base md:text-lg">{t('sessions.noScheduled')}</p>
                  <p className="text-gray-400 text-xs md:text-sm mt-2">{t('sessions.enjoyDay')}</p>
                </div>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {todaysSessions.map((session) => (
                    <div key={session._id} className="border-2 border-gray-200 rounded-xl p-3 md:p-5 hover:shadow-lg transition-all hover:border-primary-300 bg-white/80 backdrop-blur-md">
                      {/* Header Section */}
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3 md:mb-4 pb-3 md:pb-4 border-b border-gray-100">
                        <div className="flex-1">
                          <h4
                            className="text-lg md:text-xl font-bold text-primary-600 mb-1 cursor-pointer hover:text-primary-700 hover:underline"
                            onClick={() => handleStudentClick(session)}
                          >
                            {session.customerId.userId.name}
                          </h4>
                          <div className="flex flex-col gap-1 text-xs md:text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span className="break-all">{session.customerId.userId.email}</span>
                            </div>
                            {session.customerId.userId.phone && (
                              <a
                                href={`https://line.me/ti/p/~${session.customerId.userId.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:underline transition-colors"
                              >
                                <svg className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                                </svg>
                                {session.customerId.userId.phone}
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="text-right sm:text-right">
                          <div className="text-xl md:text-2xl font-bold text-primary-600">
                            {formatStudioTime(session.startTime, 'h:mm a')}
                          </div>
                          <div className="text-xs md:text-sm text-gray-500">
                            {formatStudioTime(session.startTime, 'MMM d, yyyy')}
                          </div>
                        </div>
                      </div>

                      {/* Session Info */}
                      <div className="flex flex-wrap gap-2 mb-3 md:mb-4">
                        <span className={`inline-block px-2 md:px-3 py-1 md:py-1.5 rounded-full text-xs font-semibold ${getStatusColor(session.status)}`}>
                          {session.status}
                        </span>
                        <span className="inline-block px-2 md:px-3 py-1 md:py-1.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 capitalize">
                          {session.type}
                        </span>
                        {session.packageId && (
                          <>
                            <span className="inline-block px-2 md:px-3 py-1 md:py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                              {session.packageId.name}
                            </span>
                            {session.packageId.remainingSessions !== undefined && (
                              <span className="inline-block px-2 md:px-3 py-1 md:py-1.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                {session.packageId.remainingSessions} {t('sessions.sessionsRemaining')}
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Notes Section */}
                      {session.notes && (
                        <div className="mb-3 p-2 md:p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r text-xs md:text-sm">
                          <div className="flex items-start gap-2">
                            <svg className="w-3 h-3 md:w-4 md:h-4 mt-0.5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <div className="flex-1">
                              <span className="font-semibold text-blue-800">{t('sessions.bookingNotes')}:</span>
                              <p className="text-blue-700 mt-1">{session.notes}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Health Notes */}
                      {session.customerId.healthNotes && (
                        <div className="mb-3 p-2 md:p-3 bg-orange-50 border-l-4 border-orange-400 rounded-r text-xs md:text-sm">
                          <div className="flex items-start gap-2">
                            <span className="text-base md:text-lg">⚠️</span>
                            <div className="flex-1">
                              <span className="font-semibold text-orange-800">{t('sessions.healthNotes')}:</span>
                              <p className="text-orange-700 mt-1">{session.customerId.healthNotes}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="pt-3 md:pt-4 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-2 md:gap-3">
                        {/* Review Button for Completed Sessions */}
                        {session.status === 'completed' && !session.hasReview && (
                          <button
                            onClick={() => handleOpenReviewModal(session)}
                            className="px-4 md:px-6 py-2 text-xs md:text-sm font-medium text-primary-600 hover:text-primary-700 border-2 border-primary-300 hover:border-primary-400 rounded-lg hover:bg-primary-50 transition-all"
                          >
                            {t('sessions.writeReview')}
                          </button>
                        )}
                        {session.status === 'completed' && session.hasReview && (
                          <span className="px-4 md:px-6 py-2 text-xs md:text-sm font-medium text-green-600 bg-green-50 border-2 border-green-300 rounded-lg text-center">
                            ✓ {t('sessions.reviewed')}
                          </span>
                        )}

                        {/* Cancel Button */}
                        {session.status !== 'cancelled' && canCancelSession(session.startTime) && (
                          <button
                            onClick={() => handleCancelSession(session._id, session.startTime)}
                            className="px-4 md:px-6 py-2 text-xs md:text-sm font-medium text-red-600 hover:text-red-700 border-2 border-red-300 hover:border-red-400 rounded-lg hover:bg-red-50 transition-all"
                          >
                            {t('sessions.cancelSession')}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Student Info Modal */}
      <Dialog open={isStudentModalOpen} onOpenChange={setIsStudentModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
          {selectedStudent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl md:text-2xl">{t('studentInfo.title')}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 md:space-y-6">
                {/* Profile Section */}
                <div className="flex items-center gap-3 md:gap-4 pb-3 md:pb-4 border-b">
                  {selectedStudent.customerId.profilePhoto ? (
                    selectedStudent.customerId.profilePhoto.startsWith('http') ? (
                      <img
                        src={selectedStudent.customerId.profilePhoto}
                        alt={selectedStudent.customerId.userId.name}
                        className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-2 border-primary-200"
                      />
                    ) : (
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${selectedStudent.customerId.profilePhoto}`}
                        alt={selectedStudent.customerId.userId.name}
                        className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-2 border-primary-200"
                      />
                    )
                  ) : (
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl md:text-3xl font-bold">
                      {selectedStudent.customerId.userId.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg md:text-2xl font-bold text-gray-900">{selectedStudent.customerId.userId.name}</h3>
                    <p className="text-sm md:text-base text-gray-600 break-all">{selectedStudent.customerId.userId.email}</p>
                  </div>
                </div>

                {/* Basic Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  {calculateAge(selectedStudent.customerId.dateOfBirth) !== null && (
                    <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                      <div className="text-xs md:text-sm text-gray-500 mb-1">{t('studentInfo.age')}</div>
                      <div className="text-base md:text-lg font-semibold text-gray-900">
                        {calculateAge(selectedStudent.customerId.dateOfBirth)} {t('studentInfo.years')}
                      </div>
                    </div>
                  )}
                  {selectedStudent.customerId.gender && (
                    <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                      <div className="text-xs md:text-sm text-gray-500 mb-1">{t('studentInfo.gender')}</div>
                      <div className="text-base md:text-lg font-semibold text-gray-900 capitalize">
                        {selectedStudent.customerId.gender}
                      </div>
                    </div>
                  )}
                  {selectedStudent.customerId.height && (
                    <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                      <div className="text-xs md:text-sm text-gray-500 mb-1">{t('studentInfo.height')}</div>
                      <div className="text-base md:text-lg font-semibold text-gray-900">
                        {selectedStudent.customerId.height} {t('studentInfo.cm')}
                      </div>
                    </div>
                  )}
                  {selectedStudent.customerId.weight && (
                    <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                      <div className="text-xs md:text-sm text-gray-500 mb-1">{t('studentInfo.weight')}</div>
                      <div className="text-base md:text-lg font-semibold text-gray-900">
                        {selectedStudent.customerId.weight} {t('studentInfo.kg')}
                      </div>
                    </div>
                  )}
                </div>

                {/* Package Info */}
                {studentPackages.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs md:text-sm font-medium text-gray-700">{t('studentInfo.activePackages')}</div>
                    {studentPackages.map((pkg: any) => (
                      <div key={pkg._id} className="bg-blue-50 rounded-lg p-3 md:p-4 border border-blue-200">
                        <div className="space-y-2">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                            <span className="text-sm md:text-base text-gray-700 font-medium">{pkg.name}</span>
                            <span className="px-2 md:px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs md:text-sm font-semibold capitalize self-start">
                              {pkg.type}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs md:text-sm">
                            <span className="text-gray-600">{t('studentInfo.sessionsRemaining')}</span>
                            <span className="font-semibold text-gray-900">
                              {pkg.remainingSessions} / {pkg.totalSessions}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs text-gray-500">
                            <span>{t('studentInfo.validUntil')}</span>
                            <span>{new Date(pkg.validTo).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Medical Conditions */}
                {(selectedStudent.customerId.healthNotes || selectedStudent.customerId.medicalNotes) && (
                  <div className="bg-orange-50 rounded-lg p-3 md:p-4 border border-orange-200">
                    <div className="flex items-start gap-2">
                      <span className="text-xl md:text-2xl">⚠️</span>
                      <div className="flex-1">
                        <div className="text-xs md:text-sm font-medium text-orange-600 mb-2">{t('studentInfo.medicalConditions')}</div>
                        {selectedStudent.customerId.healthNotes && (
                          <p className="text-xs md:text-sm text-gray-700 mb-2">{selectedStudent.customerId.healthNotes}</p>
                        )}
                        {selectedStudent.customerId.medicalNotes && (
                          <p className="text-xs md:text-sm text-gray-700">{selectedStudent.customerId.medicalNotes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Modal */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-6">
          {selectedSessionForReview && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl md:text-2xl">{t('review.title')}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 md:space-y-6">
                {/* Session Info */}
                <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                  <div className="text-sm md:text-base font-semibold text-gray-900 mb-1">
                    {selectedSessionForReview.customerId.userId.name}
                  </div>
                  <div className="text-xs md:text-sm text-gray-600">
                    {formatStudioTime(selectedSessionForReview.startTime, 'EEEE, MMM d, yyyy')} at {formatStudioTime(selectedSessionForReview.startTime, 'h:mm a')}
                  </div>
                </div>

                {/* Rating Categories */}
                <div className="space-y-3 md:space-y-4">
                  <div className="text-xs md:text-sm font-medium text-gray-700 mb-2 md:mb-3">{t('review.ratePerformance')}</div>

                  {/* Control */}
                  <div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                      <span className="text-xs md:text-sm font-medium text-gray-700">{t('review.control')}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            onClick={() => setReviewRatings(prev => ({ ...prev, control: rating }))}
                            className="focus:outline-none"
                          >
                            <svg
                              className={`w-6 h-6 md:w-8 md:h-8 ${reviewRatings.control >= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Posture & Alignment */}
                  <div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                      <span className="text-xs md:text-sm font-medium text-gray-700">{t('review.postureAlignment')}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            onClick={() => setReviewRatings(prev => ({ ...prev, postureAlignment: rating }))}
                            className="focus:outline-none"
                          >
                            <svg
                              className={`w-6 h-6 md:w-8 md:h-8 ${reviewRatings.postureAlignment >= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Strength */}
                  <div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                      <span className="text-xs md:text-sm font-medium text-gray-700">{t('review.strength')}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            onClick={() => setReviewRatings(prev => ({ ...prev, strength: rating }))}
                            className="focus:outline-none"
                          >
                            <svg
                              className={`w-6 h-6 md:w-8 md:h-8 ${reviewRatings.strength >= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Flexibility / Mobility */}
                  <div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                      <span className="text-xs md:text-sm font-medium text-gray-700">{t('review.flexibilityMobility')}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            onClick={() => setReviewRatings(prev => ({ ...prev, flexibilityMobility: rating }))}
                            className="focus:outline-none"
                          >
                            <svg
                              className={`w-6 h-6 md:w-8 md:h-8 ${reviewRatings.flexibilityMobility >= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Body Awareness / Focus */}
                  <div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                      <span className="text-xs md:text-sm font-medium text-gray-700">{t('review.bodyAwarenessFocus')}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            onClick={() => setReviewRatings(prev => ({ ...prev, bodyAwarenessFocus: rating }))}
                            className="focus:outline-none"
                          >
                            <svg
                              className={`w-6 h-6 md:w-8 md:h-8 ${reviewRatings.bodyAwarenessFocus >= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes (Optional) */}
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                    {t('review.additionalNotes')}
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder={t('review.notesPlaceholder')}
                    rows={4}
                    className="w-full px-2 md:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-xs md:text-sm"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex flex-col sm:flex-row justify-end gap-2 md:gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsReviewModalOpen(false)}
                    size="sm"
                    className="text-xs md:text-sm"
                  >
                    {t('review.cancel')}
                  </Button>
                  <Button
                    onClick={handleSubmitReview}
                    size="sm"
                    className="text-xs md:text-sm"
                  >
                    {t('review.submit')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Toaster position="top-right" />
    </div>
  );
}
