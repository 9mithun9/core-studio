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
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
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
  const [timeRemaining, setTimeRemaining] = useState<{days: number; hours: number; minutes: number; seconds: number} | null>(null);

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

  // Countdown timer for next session
  useEffect(() => {
    if (!nextSession?.startTime) return;

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const sessionTime = new Date(nextSession.startTime).getTime();
      const difference = sessionTime - now;

      if (difference <= 0) {
        setTimeRemaining(null);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

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

      // Fetch today's sessions and sort by time (earliest first)
      const todayResponse: any = await apiClient.get('/teachers/sessions/today');
      console.log('Todays sessions:', todayResponse);
      const sortedSessions = (todayResponse.sessions || []).sort((a: Booking, b: Booking) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      setTodaysSessions(sortedSessions);
      setAllTodaySessions(sortedSessions);

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

  // Helper function to format date in local timezone
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleFilterChange = async (filter: 'today' | 'tomorrow' | 'date', date?: string) => {
    setSessionFilter(filter);

    if (filter === 'today') {
      const today = new Date();
      const localDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      setSelectedDate(formatLocalDate(today));
      setTodaysSessions(allTodaySessions);
    } else if (filter === 'tomorrow') {
      try {
        const today = new Date();
        const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        setSelectedDate(formatLocalDate(tomorrow));

        // Create date range in local timezone
        const startOfDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59, 999);

        const response: any = await apiClient.get('/teachers/sessions', {
          params: {
            from: startOfDay.toISOString(),
            to: endOfDay.toISOString(),
          },
        });
        const sortedSessions = (response.sessions || []).sort((a: Booking, b: Booking) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        setTodaysSessions(sortedSessions);
      } catch (error) {
        console.error('Failed to fetch tomorrow sessions:', error);
        toast.error(t('errors.loadSessions'));
      }
    } else if (filter === 'date' && date) {
      setSelectedDate(date);
      try {
        // Parse the date string correctly to avoid timezone issues
        const [year, month, day] = date.split('-').map(Number);
        const selectedDay = new Date(year, month - 1, day);

        // Create date range in local timezone
        const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
        const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

        const response: any = await apiClient.get('/teachers/sessions', {
          params: {
            from: startOfDay.toISOString(),
            to: endOfDay.toISOString(),
          },
        });
        const sortedSessions = (response.sessions || []).sort((a: Booking, b: Booking) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        setTodaysSessions(sortedSessions);
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
      {/* Stats Cards - Executive Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Total Completed */}
        <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-6 md:p-8 text-white overflow-hidden shadow-xl transform hover:scale-105 transition-all duration-300">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-400 rounded-full opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-indigo-400 rounded-full opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="relative z-10">
            <p className="text-sm font-medium opacity-90 mb-3">{t('stats.totalCompleted')}</p>
            <p className="text-3xl md:text-4xl font-bold">{stats.totalCompleted}</p>
          </div>
        </div>

        {/* This Month */}
        <div className="relative bg-gradient-to-br from-purple-600 via-purple-700 to-pink-700 rounded-2xl p-6 md:p-8 text-white overflow-hidden shadow-xl transform hover:scale-105 transition-all duration-300">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-400 rounded-full opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-pink-400 rounded-full opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="relative z-10">
            <p className="text-sm font-medium opacity-90 mb-3">{t('stats.thisMonth')}</p>
            <p className="text-3xl md:text-4xl font-bold">{stats.thisMonth}</p>
          </div>
        </div>

        {/* Next Session */}
        <div className="relative bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-700 rounded-2xl p-6 text-white overflow-hidden shadow-xl transform hover:scale-105 transition-all duration-300">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-teal-400 rounded-full opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-cyan-400 rounded-full opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="relative z-10">
            {/* Title and Badges Row */}
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <p className="text-sm font-medium opacity-90">{t('nextSession.title')}</p>
              {nextSession && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                    nextSession.status === 'confirmed'
                      ? 'bg-green-400/30 text-green-100 border border-green-300/50'
                      : 'bg-yellow-400/30 text-yellow-100 border border-yellow-300/50'
                  }`}>
                    {nextSession.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                  </span>
                  {nextSession.packageId && (
                    <>
                      <span className="px-2 py-0.5 bg-white/20 rounded text-[9px] font-semibold border border-white/30">
                        {nextSession.packageId.type === 'single' ? 'Single' :
                         nextSession.packageId.type === 'duo' ? 'Duo' :
                         nextSession.packageId.type === 'group' ? 'Group' : nextSession.packageId.type}
                      </span>
                      {nextSession.sessionNumber && nextSession.packageId.totalSessions && (
                        <span className="px-2 py-0.5 bg-white/20 rounded text-[9px] font-semibold border border-white/30">
                          {nextSession.sessionNumber}/{nextSession.packageId.totalSessions}
                        </span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {nextSession ? (
              <div className="flex flex-col md:flex-row gap-3 md:gap-4 md:items-start">
                {/* Session Details */}
                <div className="flex-1 space-y-1">
                  <p className="text-2xl md:text-3xl font-bold leading-tight">{formatStudioTime(nextSession.startTime, 'h:mm a')}</p>
                  <p className="text-xs opacity-90">{formatStudioTime(nextSession.startTime, 'EEE, MMM d')} • {nextSession.customerId.userId.name}</p>
                </div>

                {/* Countdown Timer */}
                {timeRemaining && (
                  <div className="flex gap-2 justify-center md:justify-end items-center">
                    <div className="flex flex-col items-center">
                      <div className="text-2xl md:text-3xl font-bold leading-tight">{timeRemaining.days}</div>
                      <div className="text-[10px] text-white/80 uppercase leading-tight">Days</div>
                    </div>
                    <div className="text-2xl md:text-3xl font-bold opacity-50 leading-tight">:</div>
                    <div className="flex flex-col items-center">
                      <div className="text-2xl md:text-3xl font-bold leading-tight">{String(timeRemaining.hours).padStart(2, '0')}</div>
                      <div className="text-[10px] text-white/80 uppercase leading-tight">Hours</div>
                    </div>
                    <div className="text-2xl md:text-3xl font-bold opacity-50 leading-tight">:</div>
                    <div className="flex flex-col items-center">
                      <div className="text-2xl md:text-3xl font-bold leading-tight">{String(timeRemaining.minutes).padStart(2, '0')}</div>
                      <div className="text-[10px] text-white/80 uppercase leading-tight">Mins</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-lg font-semibold">{t('nextSession.noUpcoming')}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* LEFT COLUMN - Pending Requests */}
        <div className="lg:col-span-1 space-y-4 md:space-y-6">
          {/* Pending Booking Requests */}
          <div className="bg-white/30 backdrop-blur-md rounded-3xl shadow-2xl border border-white/40 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-pink-500 px-6 py-4">
              <h3 className="text-xl font-bold text-white">{t('requests.title')} ({pendingRequests.length})</h3>
            </div>
            <div className="p-6">
              <div className="mb-3">
                <button
                  onClick={() => router.push('/teacher/session-requests')}
                  className="text-orange-600 hover:text-orange-700 text-xs md:text-sm font-medium hover:underline cursor-pointer"
                >
                  {t('requests.viewAll')} →
                </button>
              </div>
              {pendingRequests.length === 0 ? (
                <p className="text-sm md:text-base text-gray-500">{t('requests.noPending')}</p>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.slice(0, 3).map((request) => (
                    <div key={request._id} className="bg-white/40 backdrop-blur-sm rounded-2xl p-3 md:p-4 border border-white/50 hover:border-orange-300 hover:shadow-lg transition-all">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                        <div className="flex-1">
                          <p className="text-sm md:text-base font-semibold text-gray-900">{request.customerId.userId.name}</p>
                          <p className="text-xs md:text-sm text-gray-600 break-all">{request.customerId.userId.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs md:text-sm font-medium text-orange-600">{formatStudioTime(request.startTime, 'h:mm a')}</p>
                          <p className="text-xs text-gray-600">{formatStudioTime(request.startTime, 'EEE, MMM d')}</p>
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
                          className="flex-1 text-xs py-1 h-8 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
                        >
                          {t('requests.approve')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectRequest(request._id)}
                          className="flex-1 text-xs py-1 h-8 border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400"
                        >
                          {t('requests.reject')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - Today's Sessions */}
        <div className="lg:col-span-2">
          <div className="bg-white/30 backdrop-blur-md rounded-3xl shadow-2xl border border-white/40 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-pink-500 px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-xl md:text-2xl font-bold text-white">
                  {todaysSessions.length} {t('sessions.title')}
                </h3>
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    onClick={() => handleFilterChange('today')}
                    className={`px-2 md:px-3 py-1 rounded-md text-xs md:text-sm font-medium transition-colors ${
                      sessionFilter === 'today'
                        ? 'bg-white text-orange-600'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    {t('sessions.today')}
                  </button>
                  <button
                    onClick={() => handleFilterChange('tomorrow')}
                    className={`px-2 md:px-3 py-1 rounded-md text-xs md:text-sm font-medium transition-colors ${
                      sessionFilter === 'tomorrow'
                        ? 'bg-white text-orange-600'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    {t('sessions.tomorrow')}
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleFilterChange('date', e.target.value)}
                    className="px-2 md:px-3 py-1 border border-white/30 bg-white/20 text-white placeholder-white/70 rounded-md text-xs md:text-sm w-full sm:w-auto"
                  />
                </div>
              </div>
            </div>
            <div className="p-6">
              {todaysSessions.length === 0 ? (
                <div className="text-center py-8 md:py-12">
                  <p className="text-gray-500 text-base md:text-lg">{t('sessions.noScheduled')}</p>
                  <p className="text-gray-400 text-xs md:text-sm mt-2">{t('sessions.enjoyDay')}</p>
                </div>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {todaysSessions.map((session) => (
                    <div key={session._id} className="bg-white/40 backdrop-blur-sm rounded-2xl p-3 md:p-4 hover:shadow-lg transition-all border border-white/50 hover:border-orange-300">
                      {/* Header Section */}
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3 pb-3 border-b border-white/40">
                        <div className="flex-1">
                          <h4
                            className="text-lg md:text-xl font-bold text-orange-600 mb-1 cursor-pointer hover:text-orange-700 hover:underline"
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
                        <div className="text-right">
                          <div className="text-xl md:text-2xl font-bold text-orange-600">
                            {formatStudioTime(session.startTime, 'h:mm a')}
                          </div>
                          <div className="text-xs md:text-sm text-gray-500">
                            {formatStudioTime(session.startTime, 'MMM d, yyyy')}
                          </div>
                        </div>
                      </div>

                      {/* Session Info */}
                      <div className="flex flex-wrap gap-2 mb-3">
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
                        <div className="mb-3 p-2 md:p-3 border-l-4 border-blue-400 rounded-r text-xs md:text-sm">
                          <span className="font-semibold text-blue-800">{t('sessions.bookingNotes')}:</span>
                          <span className="text-blue-700 ml-1">{session.notes}</span>
                        </div>
                      )}

                      {/* Health Notes */}
                      {session.customerId.healthNotes && (
                        <div className="mb-3 p-2 md:p-3 border-l-4 border-orange-400 rounded-r text-xs md:text-sm">
                          <span className="font-semibold text-orange-800">⚠️ {t('sessions.healthNotes')}:</span>
                          <span className="text-orange-700 ml-1">{session.customerId.healthNotes}</span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="pt-3 border-t border-white/40 flex flex-col sm:flex-row justify-end gap-2 md:gap-3">
                        {/* Review Button for Completed Sessions */}
                        {session.status === 'completed' && !session.hasReview && (
                          <button
                            onClick={() => handleOpenReviewModal(session)}
                            className="px-4 md:px-6 py-2 text-xs md:text-sm font-medium text-orange-600 hover:text-orange-700 border-2 border-orange-300 hover:border-orange-400 rounded-lg hover:bg-orange-50 transition-all"
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
                            className="px-4 md:px-6 py-2 text-xs md:text-sm font-medium text-orange-600 hover:text-orange-700 border-2 border-orange-300 hover:border-orange-400 rounded-lg hover:bg-orange-50 transition-all"
                          >
                            {t('sessions.cancelSession')}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Student Info Modal */}
      <Dialog open={isStudentModalOpen} onOpenChange={setIsStudentModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 !bg-white/30 backdrop-blur-xl border-2 border-white/40 shadow-2xl">
          {selectedStudent && (
            <>
              {/* Glassmorphism Header */}
              <div className="bg-gradient-to-r from-orange-500/90 to-pink-500/90 backdrop-blur-sm p-4 md:p-6 rounded-t-lg border-b border-white/20">
                <DialogHeader>
                  <DialogTitle className="text-xl md:text-2xl text-white font-bold">{t('studentInfo.title')}</DialogTitle>
                </DialogHeader>
              </div>

              <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                {/* Profile Section */}
                <div className="flex items-center gap-3 md:gap-4 pb-3 md:pb-4 border-b border-orange-200/40">
                  {selectedStudent.customerId.profilePhoto ? (
                    selectedStudent.customerId.profilePhoto.startsWith('http') ? (
                      <img
                        src={selectedStudent.customerId.profilePhoto}
                        alt={selectedStudent.customerId.userId.name}
                        className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover ring-4 ring-orange-300/50"
                      />
                    ) : (
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${selectedStudent.customerId.profilePhoto}`}
                        alt={selectedStudent.customerId.userId.name}
                        className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover ring-4 ring-orange-300/50"
                      />
                    )
                  ) : (
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-2xl md:text-3xl font-bold ring-4 ring-orange-300/50">
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
                    <div className="bg-gradient-to-br from-orange-50 to-pink-50 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-orange-200/50 hover:border-orange-300 transition-all">
                      <div className="text-xs md:text-sm text-orange-600 font-medium mb-1">{t('studentInfo.age')}</div>
                      <div className="text-base md:text-lg font-bold text-gray-900">
                        {calculateAge(selectedStudent.customerId.dateOfBirth)} {t('studentInfo.years')}
                      </div>
                    </div>
                  )}
                  {selectedStudent.customerId.gender && (
                    <div className="bg-gradient-to-br from-orange-50 to-pink-50 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-orange-200/50 hover:border-orange-300 transition-all">
                      <div className="text-xs md:text-sm text-orange-600 font-medium mb-1">{t('studentInfo.gender')}</div>
                      <div className="text-base md:text-lg font-bold text-gray-900 capitalize">
                        {selectedStudent.customerId.gender}
                      </div>
                    </div>
                  )}
                  {selectedStudent.customerId.height && (
                    <div className="bg-gradient-to-br from-orange-50 to-pink-50 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-orange-200/50 hover:border-orange-300 transition-all">
                      <div className="text-xs md:text-sm text-orange-600 font-medium mb-1">{t('studentInfo.height')}</div>
                      <div className="text-base md:text-lg font-bold text-gray-900">
                        {selectedStudent.customerId.height} {t('studentInfo.cm')}
                      </div>
                    </div>
                  )}
                  {selectedStudent.customerId.weight && (
                    <div className="bg-gradient-to-br from-orange-50 to-pink-50 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-orange-200/50 hover:border-orange-300 transition-all">
                      <div className="text-xs md:text-sm text-orange-600 font-medium mb-1">{t('studentInfo.weight')}</div>
                      <div className="text-base md:text-lg font-bold text-gray-900">
                        {selectedStudent.customerId.weight} {t('studentInfo.kg')}
                      </div>
                    </div>
                  )}
                </div>

                {/* Package Info */}
                {studentPackages.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs md:text-sm font-bold text-gray-900">{t('studentInfo.activePackages')}</div>
                    {studentPackages.map((pkg: any) => (
                      <div key={pkg._id} className="bg-white/60 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-orange-200/50 hover:border-orange-300 hover:shadow-lg transition-all">
                        <div className="space-y-2">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                            <span className="text-sm md:text-base text-gray-900 font-semibold">{pkg.name}</span>
                            <span className="px-2 md:px-3 py-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-full text-xs md:text-sm font-semibold capitalize self-start shadow-md">
                              {pkg.type}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs md:text-sm">
                            <span className="text-gray-600 font-medium">{t('studentInfo.sessionsRemaining')}</span>
                            <span className="font-bold text-orange-600">
                              {pkg.remainingSessions} / {pkg.totalSessions}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs text-gray-500">
                            <span className="font-medium">{t('studentInfo.validUntil')}</span>
                            <span className="font-semibold">{new Date(pkg.validTo).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Medical Conditions */}
                {(selectedStudent.customerId.healthNotes || selectedStudent.customerId.medicalNotes) && (
                  <div className="bg-white/40 backdrop-blur-sm rounded-xl p-3 md:p-4 border-2 border-orange-300/60 shadow-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-xl md:text-2xl">⚠️</span>
                      <div className="flex-1">
                        <div className="text-xs md:text-sm font-bold text-orange-700 mb-2">{t('studentInfo.medicalConditions')}</div>
                        {selectedStudent.customerId.healthNotes && (
                          <p className="text-xs md:text-sm text-gray-800 mb-2 font-medium">{selectedStudent.customerId.healthNotes}</p>
                        )}
                        {selectedStudent.customerId.medicalNotes && (
                          <p className="text-xs md:text-sm text-gray-800 font-medium">{selectedStudent.customerId.medicalNotes}</p>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 !bg-white/30 backdrop-blur-xl border-2 border-white/40 shadow-2xl">
          {selectedSessionForReview && (
            <>
              {/* Glassmorphism Header */}
              <div className="bg-gradient-to-r from-orange-500/90 to-pink-500/90 backdrop-blur-sm p-4 md:p-6 rounded-t-lg border-b border-white/20">
                <DialogHeader>
                  <DialogTitle className="text-xl md:text-2xl text-white font-bold">{t('review.title')}</DialogTitle>
                </DialogHeader>
              </div>

              <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                {/* Session Info */}
                <div className="bg-white/40 backdrop-blur-sm rounded-xl p-3 md:p-4 border border-orange-200/50">
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
                    className="text-xs md:text-sm border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400"
                  >
                    {t('review.cancel')}
                  </Button>
                  <Button
                    onClick={handleSubmitReview}
                    size="sm"
                    className="text-xs md:text-sm bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
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
