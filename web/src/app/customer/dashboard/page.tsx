'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatStudioTime } from '@/lib/date';
import toast, { Toaster } from 'react-hot-toast';
import '@/lib/i18n';

interface SessionReview {
  _id: string;
  ratings: {
    control: number;
    postureAlignment: number;
    strength: number;
    flexibilityMobility: number;
    bodyAwarenessFocus: number;
  };
  notes?: string;
  teacherId: {
    userId: {
      name: string;
    };
  };
}

export default function CustomerDashboard() {
  const { t } = useTranslation('customer');
  const [overview, setOverview] = useState<any>(null);
  const [allPackages, setAllPackages] = useState<any[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [packageSessions, setPackageSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({ packageType: 'private', sessions: 10, notes: '' });
  const [selectedReview, setSelectedReview] = useState<SessionReview | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<{days: number; hours: number; minutes: number; seconds: number} | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Countdown timer for next session
  useEffect(() => {
    if (!overview?.upcomingBookings?.[0]?.startTime) return;

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const sessionTime = new Date(overview.upcomingBookings[0].startTime).getTime();
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
  }, [overview]);

  // Calculate days since last session
  const getDaysSinceLastSession = () => {
    if (!overview?.completedBookings || overview.completedBookings.length === 0) {
      return null;
    }
    const lastSession = overview.completedBookings[0];
    const lastSessionDate = new Date(lastSession.startTime);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff;
  };

  const loadData = async () => {
    try {
      const [overviewData, packagesData]: any[] = await Promise.all([
        apiClient.get('/customers/me/overview'),
        apiClient.get('/packages/me'),
      ]);
      setOverview(overviewData);
      setAllPackages(packagesData.packages || []);

      // Auto-select first active package or first package
      if (packagesData.packages && packagesData.packages.length > 0) {
        const firstActive = packagesData.packages.find((p: any) => p.status === 'active');
        selectPackage(firstActive || packagesData.packages[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const selectPackage = async (pkg: any) => {
    setSelectedPackage(pkg);

    // Load sessions for this package
    try {
      const bookings: any = await apiClient.get('/bookings/me');
      const packageBookings = bookings.bookings.filter(
        (b: any) => b.packageId?._id === pkg._id
      );

      // Fetch reviews for completed sessions
      const completedBookings = packageBookings.filter(
        (b: any) => b.status === 'completed' || (b.status === 'confirmed' && new Date(b.endTime) < new Date())
      );

      // Fetch reviews in parallel for all completed sessions
      const reviewPromises = completedBookings.map(async (booking: any) => {
        try {
          const response: any = await apiClient.get(`/reviews/booking/${booking._id}`);
          return { bookingId: booking._id, review: response.review };
        } catch {
          return { bookingId: booking._id, review: null };
        }
      });

      const reviewResults = await Promise.all(reviewPromises);
      const reviewMap = new Map(reviewResults.map(r => [r.bookingId, r.review]));

      // Attach reviews to bookings
      const bookingsWithReviews = packageBookings.map((booking: any) => ({
        ...booking,
        review: reviewMap.get(booking._id) || null,
      }));

      setPackageSessions(bookingsWithReviews);
    } catch (err) {
      console.error('Failed to load package sessions', err);
      setPackageSessions([]);
    }
  };

  const calculateAverageRating = (ratings: SessionReview['ratings']) => {
    const values = Object.values(ratings);
    return values.reduce((sum, rating) => sum + rating, 0) / values.length;
  };

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };

    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`${sizeClasses[size]} ${
              rating >= star ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        ))}
      </div>
    );
  };

  const handleOpenReviewModal = (review: SessionReview) => {
    setSelectedReview(review);
    setIsReviewModalOpen(true);
  };

  const handleRequestPackage = async () => {
    const loadingToast = toast.loading(t('dashboard.submittingRequest'));

    try {
      await apiClient.post('/package-requests/request', requestForm);
      toast.success(t('dashboard.requestSuccess'), {
        id: loadingToast,
        duration: 4000,
      });
      setShowRequestModal(false);
      setRequestForm({ packageType: 'private', sessions: 10, notes: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('dashboard.requestFailed'), {
        id: loadingToast,
      });
    }
  };

  if (loading) {
    return <div className="text-center py-12">{t('dashboard.loading')}</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  // Check if we should show "We Miss You" banner
  const hasUpcomingSessions = overview.upcomingBookings && overview.upcomingBookings.length > 0;
  const daysSinceLastSession = getDaysSinceLastSession();
  const shouldShowWeMissYou = daysSinceLastSession !== null && daysSinceLastSession >= 15 && !hasUpcomingSessions;

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Hero Section & Next Session Row - Hidden when showing "We Miss You" banner */}
      {!shouldShowWeMissYou && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hero Section */}
          <div className="relative bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 md:p-8 text-white overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-5 rounded-full -ml-48 -mb-48"></div>
            <div className="relative z-10">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                {t('dashboard.welcome')}, {overview.customer?.userId?.name}!
              </h1>
              <p className="text-primary-100 mb-6 text-base md:text-lg">{t('dashboard.subtitle')}</p>
              <Link href="/customer/calendar">
                <Button size="lg" className="bg-white text-primary-700 hover:bg-gray-100">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {t('dashboard.bookSession')}
                </Button>
              </Link>
            </div>
          </div>

          {/* Next Session */}
          {(() => {
            const hasUpcomingSessions = overview.upcomingBookings && overview.upcomingBookings.length > 0;
            const daysSinceLastSession = getDaysSinceLastSession();
            const shouldShowWeMissYou = daysSinceLastSession !== null && daysSinceLastSession >= 15 && !hasUpcomingSessions;

          if (hasUpcomingSessions) {
            // Show countdown to next session
            const nextBooking = overview.upcomingBookings[0];
            return (
              <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-6 md:p-8 text-white overflow-hidden shadow-2xl">
                {/* Animated background elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-400 rounded-full opacity-20 animate-pulse"></div>
                  <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-indigo-400 rounded-full opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>

                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                        </svg>
                      </div>
                      <h3 className="text-lg md:text-xl font-bold">{t('dashboard.nextSession.title')}</h3>
                    </div>
                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-green-500 text-white">
                      {nextBooking.status}
                    </span>
                  </div>

                  {/* Session Info & Countdown in Row */}
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Session Details */}
                    <div className="flex-1 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm md:text-base font-semibold">
                          {formatStudioTime(nextBooking.startTime, 'EEEE, MMM d')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm md:text-base text-blue-100">
                          {formatStudioTime(nextBooking.startTime, 'p')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-sm md:text-base">
                          <span className="font-semibold">{nextBooking.teacherId?.userId?.name || 'Instructor'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Countdown Timer - Horizontal on larger screens */}
                    {timeRemaining && (
                      <div className="flex gap-3 md:gap-2 justify-center md:justify-end items-center">
                        <div className="flex flex-col items-center">
                          <div className="text-2xl md:text-3xl font-bold">{timeRemaining.days}</div>
                          <div className="text-xs text-blue-200 uppercase mt-0.5">Days</div>
                        </div>
                        <div className="text-2xl md:text-3xl font-bold opacity-50">:</div>
                        <div className="flex flex-col items-center">
                          <div className="text-2xl md:text-3xl font-bold">{String(timeRemaining.hours).padStart(2, '0')}</div>
                          <div className="text-xs text-blue-200 uppercase mt-0.5">Hours</div>
                        </div>
                        <div className="text-2xl md:text-3xl font-bold opacity-50">:</div>
                        <div className="flex flex-col items-center">
                          <div className="text-2xl md:text-3xl font-bold">{String(timeRemaining.minutes).padStart(2, '0')}</div>
                          <div className="text-xs text-blue-200 uppercase mt-0.5">Mins</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          } else if (!shouldShowWeMissYou) {
            // Show "No upcoming sessions" only if we're NOT showing the "We Miss You" banner
            return (
              <div className="relative bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-2xl p-6 md:p-8 text-white overflow-hidden shadow-2xl">
                {/* Animated background elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-400 rounded-full opacity-20 animate-pulse"></div>
                  <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-indigo-400 rounded-full opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>

                <div className="relative z-10">
                  <h3 className="text-2xl md:text-3xl font-bold mb-2">{t('dashboard.noSessions')}</h3>
                  <p className="text-purple-100 mb-6 text-base md:text-lg">{t('dashboard.subtitle')}</p>
                  <Link href="/customer/calendar">
                    <Button size="lg" className="bg-white text-purple-700 hover:bg-gray-100 shadow-lg hover:shadow-xl transition-all">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      {t('dashboard.bookSession')}
                    </Button>
                  </Link>
                </div>
              </div>
            );
          }
          return null;
        })()}
        </div>
      )}

      {/* Welcome Back Banner for Inactive Customers (15+ days AND no upcoming sessions) */}
      {(() => {
        const daysSinceLastSession = getDaysSinceLastSession();
        const hasUpcomingSessions = overview?.upcomingBookings && overview.upcomingBookings.length > 0;

        // Show banner only if: 15+ days since last session AND no upcoming sessions
        if (daysSinceLastSession !== null && daysSinceLastSession >= 15 && !hasUpcomingSessions) {
          return (
            <div className="relative bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 rounded-2xl p-6 md:p-8 text-white overflow-hidden shadow-2xl border-4 border-white">
              {/* Static background effects */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-20 -left-20 w-40 h-40 bg-yellow-300 rounded-full opacity-30"></div>
                <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-pink-300 rounded-full opacity-20"></div>
                <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-orange-300 rounded-full opacity-20"></div>
              </div>

              <div className="relative z-10">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {/* Static emoji/icon - sad bird */}
                  <div className="flex-shrink-0">
                    <div className="text-6xl md:text-8xl">
                      🐦
                    </div>
                  </div>

                  {/* Message content */}
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl md:text-4xl font-bold mb-2 flex items-center justify-center md:justify-start gap-2">
                      <span>{t('dashboard.weMissYou.title')}, {overview.customer?.userId?.name}!</span>
                      <span className="text-3xl md:text-5xl">💪</span>
                      <span className="text-3xl md:text-4xl">🐤</span>
                    </h2>
                    <p className="text-lg md:text-xl text-white/90 mb-4">
                      {t('dashboard.weMissYou.daysSince', { days: daysSinceLastSession })}
                      {' '}{t('dashboard.weMissYou.motivationMessage')} 🏃‍♀️✨
                    </p>
                    <p className="text-base md:text-lg mb-6 text-white/80">
                      {t('dashboard.weMissYou.encouragementMessage')} 🌟
                    </p>
                    <div className="flex justify-center md:justify-start">
                      <Link href="/customer/calendar">
                        <Button size="lg" className="bg-white text-rose-600 hover:bg-yellow-100 font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all">
                          <span className="mr-2 text-xl">🔥</span>
                          {t('dashboard.weMissYou.bookComebackSession')}
                          <span className="ml-2 text-xl">💃</span>
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Additional motivational emojis - no animation */}
                  <div className="hidden lg:flex flex-col gap-4 text-5xl">
                    <div>🦜</div>
                    <div>🌈</div>
                    <div>⭐</div>
                  </div>
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Package Status Banners */}
      {(() => {
        // Package status is calculated by backend based on:
        // 1. EXPIRED: validTo date has passed (even with remaining sessions)
        // 2. USED: No remaining sessions (all consumed)
        // 3. ACTIVE: Has remaining sessions AND within validity period
        const activePackages = allPackages.filter((p) => p.status === 'active');
        const expiredPackages = allPackages.filter((p) => p.status === 'expired');
        const usedPackages = allPackages.filter((p) => p.status === 'used');
        const lowSessionPackages = activePackages.filter(
          (p) => (p.remainingUnbooked ?? p.availableForBooking ?? p.remainingSessions) <= 2 &&
                 (p.remainingUnbooked ?? p.availableForBooking ?? p.remainingSessions) > 0
        );
        const noActivePackage = activePackages.length === 0;

        // Priority 1: Completed all sessions (USED status) - Congratulations banner
        if (noActivePackage && usedPackages.length > 0 && expiredPackages.length === 0) {
          return (
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl p-6 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">Congratulations! 🎉</h3>
                  <p className="mb-4 opacity-90">
                    You've completed all your sessions! Let's continue your journey and keep up the great work.
                  </p>
                  <Button
                    onClick={() => setShowRequestModal(true)}
                    className="bg-white text-green-600 hover:bg-gray-100"
                  >
                    Book a New Package
                  </Button>
                </div>
              </div>
            </div>
          );
        }

        // Priority 2: Package expired or no packages
        if (noActivePackage && (expiredPackages.length > 0 || allPackages.length === 0)) {
          return (
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl p-6 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">{t('dashboard.packageExpired.title')}</h3>
                  <p className="mb-4 opacity-90">{t('dashboard.packageExpired.message')}</p>
                  <Button
                    onClick={() => setShowRequestModal(true)}
                    className="bg-white text-orange-600 hover:bg-gray-100"
                  >
                    {t('dashboard.packageExpired.action')}
                  </Button>
                </div>
              </div>
            </div>
          );
        }

        // Priority 3: Low sessions warning
        if (lowSessionPackages.length > 0) {
          const pkg = lowSessionPackages[0];
          const remaining = pkg.remainingUnbooked ?? pkg.availableForBooking ?? pkg.remainingSessions;
          return (
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 rounded-xl p-6 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-white bg-opacity-30 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">
                    {remaining === 1 ? t('dashboard.lowSessions.titleOne') : t('dashboard.lowSessions.titleMultiple')}
                  </h3>
                  <p className="mb-4 opacity-90">
                    {t('dashboard.lowSessions.message')} <strong>{remaining} {remaining > 1 ? t('dashboard.lowSessions.sessions') : t('dashboard.lowSessions.session')}</strong> {t('dashboard.lowSessions.messagePart2')} {pkg.name}. {t('dashboard.lowSessions.messagePart3')}
                  </p>
                  <Button
                    onClick={() => setShowRequestModal(true)}
                    className="bg-yellow-900 text-white hover:bg-yellow-800"
                  >
                    {t('dashboard.lowSessions.action')}
                  </Button>
                </div>
              </div>
            </div>
          );
        }

        return null;
      })()}

      {/* Packages and History - Side by Side Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Package List */}
        <div className="lg:col-span-1">
          <div className="relative bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-6 overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-5 rounded-full -ml-48 -mb-48"></div>

            {/* Header */}
            <div className="relative z-10 mb-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-white">{t('dashboard.myPackages.title')}</h2>
                {(() => {
                  // Backend calculates status correctly - just check if status is 'active'
                  const hasActivePackage = allPackages.some(p => p.status === 'active');
                  return (
                    <Button
                      size="sm"
                      onClick={() => setShowRequestModal(true)}
                      className="bg-white text-purple-600 hover:bg-purple-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </Button>
                  );
                })()}
              </div>
              <p className="text-purple-100 text-sm">{t('dashboard.myPackages.description')}</p>
            </div>

            {/* Package Cards */}
            {allPackages.length > 0 ? (
              <div className="relative z-10 space-y-3 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
              {allPackages.map((pkg) => {
                const remaining = pkg.remainingUnbooked ?? pkg.availableForBooking ?? pkg.remainingSessions;
                const total = pkg.totalSessions;
                const percentage = (remaining / total) * 100;
                const isActive = pkg.status === 'active';
                const isExpired = pkg.status === 'expired';

                return (
                  <button
                    key={pkg._id}
                    onClick={() => selectPackage(pkg)}
                    className={`w-full text-left rounded-xl p-4 transition-all duration-200 ${
                      selectedPackage?._id === pkg._id
                        ? 'bg-purple-50 ring-2 ring-purple-400 shadow-lg border-2 border-purple-400'
                        : 'bg-white hover:shadow-md border border-gray-100'
                    }`}
                  >
                    {/* Package Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-base text-gray-800">{pkg.name}</div>
                      </div>
                      <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                        <span className="text-xs text-gray-600 capitalize bg-gray-100 px-2 py-0.5 rounded-full">
                          {pkg.type}
                        </span>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                            isActive
                              ? 'bg-green-100 text-green-700'
                              : isExpired
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {pkg.status}
                        </span>
                      </div>
                    </div>

                    {/* Session Display */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-baseline gap-2">
                        <div className={`text-3xl font-bold ${
                          percentage > 50 ? 'text-green-600' :
                          percentage > 20 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {remaining}
                        </div>
                        <div className="text-sm text-gray-500">
                          / {total} sessions
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 font-medium">
                        {percentage.toFixed(0)}%
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                      <div
                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
                          percentage > 50
                            ? 'bg-green-500'
                            : percentage > 20
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>

                    {/* Valid Until */}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Valid until {formatStudioTime(pkg.validTo, 'MMM d, yyyy')}</span>
                    </div>
                  </button>
                );
              })}
              </div>
            ) : (
              <div className="relative z-10 bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-8 text-center border border-white border-opacity-20">
                <div className="w-16 h-16 mx-auto mb-4 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <p className="text-base font-bold text-white mb-2">{t('dashboard.myPackages.noPackages')}</p>
                <p className="text-sm text-purple-100 mb-4">{t('dashboard.myPackages.noPackagesMessage')}</p>
                <Button
                  onClick={() => setShowRequestModal(true)}
                  className="bg-white text-purple-600 hover:bg-purple-50"
                >
                  {t('dashboard.myPackages.requestFirst')}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Package Details and Session History */}
        <div className="lg:col-span-2">
          {selectedPackage ? (
            <div className="relative bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-6 overflow-hidden">
              {/* Background decorations */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-5 rounded-full -ml-48 -mb-48"></div>

              {/* Header */}
              <div className="relative z-10 mb-6">
                <h2 className="text-xl font-bold text-white mb-1">{t('dashboard.packageDetails.title')}</h2>
                <p className="text-purple-100 text-sm">{selectedPackage.name}</p>
              </div>

              <div className="relative z-10 space-y-6">
                {/* Package Stats */}
                <div className="grid grid-cols-4 gap-2 md:gap-4 p-3 md:p-4 bg-white bg-opacity-10 backdrop-blur-sm rounded-xl border border-white border-opacity-20">
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-white">
                      {selectedPackage.totalSessions}
                    </div>
                    <div className="text-xs text-purple-100 mt-1">{t('dashboard.packageDetails.total')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-green-300">
                      {selectedPackage.completedCount || 0}
                    </div>
                    <div className="text-xs text-purple-100 mt-1">{t('dashboard.packageDetails.completed')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-blue-300">
                      {selectedPackage.upcomingCount || 0}
                    </div>
                    <div className="text-xs text-purple-100 mt-1">{t('dashboard.packageDetails.upcoming')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-orange-300">
                      {selectedPackage.remainingUnbooked ?? selectedPackage.availableForBooking ?? 0}
                    </div>
                    <div className="text-xs text-purple-100 mt-1">{t('dashboard.myPackages.remaining')}</div>
                  </div>
                </div>

                {/* Package Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-white border-opacity-20">
                    <span className="text-purple-100">{t('dashboard.packageDetails.type')}</span>
                    <span className="font-medium text-white capitalize">{selectedPackage.type}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white border-opacity-20">
                    <span className="text-purple-100">{t('dashboard.packageDetails.validFrom')}</span>
                    <span className="font-medium text-white">
                      {formatStudioTime(selectedPackage.validFrom, 'PPP')}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white border-opacity-20">
                    <span className="text-purple-100">{t('dashboard.packageDetails.validUntil')}</span>
                    <span className="font-medium text-white">
                      {formatStudioTime(selectedPackage.validTo, 'PPP')}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-purple-100">{t('dashboard.packageDetails.status')}</span>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium capitalize ${
                        selectedPackage.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : selectedPackage.status === 'expired'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {selectedPackage.status}
                    </span>
                  </div>
                </div>

                {/* Session History */}
                <div>
                  <h3 className="font-semibold text-base md:text-lg mb-3 text-white">{t('dashboard.packageDetails.sessionHistory')}</h3>
                {packageSessions.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1 scrollbar-thin">
                      {packageSessions
                        .sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                        .map((session: any) => (
                          <div
                            key={session._id}
                            className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-l-4 bg-gradient-to-r from-gray-50 to-white rounded-lg hover:shadow-md transition-all gap-3 border border-gray-100"
                            style={{
                              borderLeftColor:
                                session.status === 'completed' || (session.status === 'confirmed' && new Date(session.endTime) < new Date())
                                  ? '#10b981'
                                  : session.status === 'confirmed'
                                  ? '#3b82f6'
                                  : session.status === 'cancelled'
                                  ? '#ef4444'
                                  : '#f59e0b'
                            }}
                          >
                            <div className="flex-1 flex items-start gap-3">
                              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm text-gray-800">
                                  {formatStudioTime(session.startTime, 'EEEE, MMM d, yyyy')}
                                </div>
                                <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {formatStudioTime(session.startTime, 'p')} - {formatStudioTime(session.endTime, 'p')}
                                </div>
                                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  {session.teacherId?.userId?.name || 'Instructor'}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-start sm:items-end gap-1 w-full sm:w-auto">
                              <span
                                className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                                  session.status === 'completed' || (session.status === 'confirmed' && new Date(session.endTime) < new Date())
                                    ? 'bg-green-100 text-green-800'
                                    : session.status === 'noShow'
                                    ? 'bg-gray-100 text-gray-800'
                                    : session.status === 'confirmed'
                                    ? 'bg-blue-100 text-blue-800'
                                    : session.status === 'cancelled'
                                    ? 'bg-red-100 text-red-800'
                                    : session.status === 'cancellationRequested'
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {session.status === 'cancellationRequested'
                                  ? t('dashboard.sessionStatus.cancellationPending')
                                  : session.status === 'noShow'
                                  ? t('dashboard.sessionStatus.noShow')
                                  : session.status === 'confirmed' && new Date(session.endTime) < new Date()
                                  ? t('dashboard.sessionStatus.completed')
                                  : session.status === 'completed'
                                  ? t('dashboard.sessionStatus.completed')
                                  : session.status === 'confirmed'
                                  ? t('dashboard.sessionStatus.confirmed')
                                  : session.status === 'cancelled'
                                  ? t('dashboard.sessionStatus.cancelled')
                                  : session.status}
                              </span>

                              {/* Review Display - under completed tag */}
                              {session.review && (session.status === 'completed' || (session.status === 'confirmed' && new Date(session.endTime) < new Date())) && (
                                <button
                                  onClick={() => handleOpenReviewModal(session.review)}
                                  className="flex items-center gap-2 hover:opacity-80 transition"
                                >
                                  {renderStars(calculateAverageRating(session.review.ratings), 'sm')}
                                  <span className="text-xs text-gray-600">
                                    ({calculateAverageRating(session.review.ratings).toFixed(1)})
                                  </span>
                                  <span className="text-xs text-primary-600">{t('dashboard.sessionStatus.viewDetails')}</span>
                                </button>
                              )}
                              {/* Cancel button for PENDING sessions (can always cancel) */}
                              {session.status === 'pending' && new Date(session.startTime) > new Date() && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs w-full sm:w-auto"
                                  onClick={async () => {
                                    if (!confirm('Are you sure you want to cancel this booking request?')) {
                                      return;
                                    }
                                    const loadingToast = toast.loading('Cancelling request...');
                                    try {
                                      await apiClient.delete(`/bookings/${session._id}`);
                                      toast.success('Booking request cancelled successfully', {
                                        id: loadingToast,
                                        duration: 3000,
                                      });
                                      loadData();
                                    } catch (err: any) {
                                      toast.error(err.response?.data?.error || 'Failed to cancel request', {
                                        id: loadingToast,
                                      });
                                    }
                                  }}
                                >
                                  Cancel Request
                                </Button>
                              )}
                              {/* Cancel button for CONFIRMED sessions (6-hour rule applies) */}
                              {session.status === 'confirmed' && new Date(session.startTime) > new Date() && (() => {
                                const now = new Date();
                                const hoursUntil = (new Date(session.startTime).getTime() - now.getTime()) / (1000 * 60 * 60);
                                const canCancel = hoursUntil >= 6;

                                if (!canCancel) {
                                  return (
                                    <div className="relative group">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs cursor-not-allowed opacity-60 w-full sm:w-auto"
                                        disabled={true}
                                      >
                                        {t('dashboard.sessionStatus.cannotCancel')}
                                      </Button>
                                      <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                                        {t('dashboard.sessionStatus.cancelTooltip')}
                                        <div className="absolute top-full right-4 w-2 h-2 bg-gray-900 transform rotate-45 -mt-1"></div>
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs w-full sm:w-auto"
                                    onClick={async () => {
                                      const reason = prompt(t('dashboard.cancellation.reasonPrompt'));
                                      if (reason !== null) {
                                        const loadingToast = toast.loading(t('dashboard.cancellation.requestingCancellation'));
                                        try {
                                          await apiClient.post(`/bookings/${session._id}/request-cancellation`, {
                                            reason,
                                          });
                                          toast.success(t('dashboard.cancellation.successMessage'), {
                                            id: loadingToast,
                                            duration: 3000,
                                          });
                                          loadData();
                                        } catch (err: any) {
                                          toast.error(err.response?.data?.error || t('dashboard.cancellation.failedMessage'), {
                                            id: loadingToast,
                                          });
                                        }
                                      }
                                    }}
                                  >
                                    {t('dashboard.sessionStatus.cancel')}
                                  </Button>
                                );
                              })()}
                            </div>
                          </div>
                        ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-white mb-4">{t('dashboard.packageDetails.noSessions')}</p>
                    {selectedPackage.status === 'active' && (
                      <Link href="/customer/calendar">
                        <Button size="lg" className="bg-white text-purple-700 hover:bg-gray-100 shadow-lg hover:shadow-xl transition-all">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          {t('dashboard.packageDetails.bookFirst')}
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
                </div>
              </div>
            </div>
          ) : (
            <div className="relative bg-gray-100 rounded-2xl p-6 md:p-8 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <p className="text-sm md:text-base">{t('dashboard.packageDetails.selectPackage')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Package Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all">
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 md:px-8 py-6 md:py-8 relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full -ml-12 -mb-12"></div>
              </div>

              <div className="flex items-center justify-between relative z-10">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">{t('dashboard.requestModal.title')}</h2>
                  <p className="text-purple-100 text-sm">Choose your perfect package</p>
                </div>
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 md:px-8 py-6 md:py-8 space-y-6">
              {/* Package Type Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  {t('dashboard.requestModal.packageType')}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['private', 'duo', 'group'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setRequestForm({ ...requestForm, packageType: type })}
                      className={`px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
                        requestForm.packageType === type
                          ? 'border-purple-600 bg-gradient-to-br from-purple-50 to-indigo-50 text-purple-700 shadow-md'
                          : 'border-gray-200 hover:border-purple-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="capitalize">{t(`packages.${type}`)}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of Sessions */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  {t('dashboard.requestModal.sessions')}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[1, 5, 10, 20, 30].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setRequestForm({ ...requestForm, sessions: count })}
                      className={`px-4 py-4 rounded-xl border-2 font-medium transition-all ${
                        requestForm.sessions === count
                          ? 'border-purple-600 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-md'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`text-2xl font-bold mb-1 ${requestForm.sessions === count ? 'text-purple-700' : 'text-gray-900'}`}>
                        {count}
                      </div>
                      <div className={`text-xs ${requestForm.sessions === count ? 'text-purple-600' : 'text-gray-500'}`}>
                        {count === 1 ? 'session' : 'sessions'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  {t('dashboard.requestModal.notes')}
                </label>
                <textarea
                  value={requestForm.notes}
                  onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                  placeholder={t('dashboard.requestModal.notesPlaceholder')}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all resize-none text-base"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 py-6 text-base font-semibold border-2 border-gray-300 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl"
                >
                  {t('dashboard.requestModal.cancel')}
                </Button>
                <Button
                  onClick={handleRequestPackage}
                  className="flex-1 py-6 text-base font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  {t('dashboard.requestModal.submit')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Details Modal */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedReview && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl md:text-2xl">{t('dashboard.reviewModal.title')}</DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Teacher Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">{t('dashboard.reviewModal.reviewBy')}</div>
                  <div className="font-semibold text-gray-900 mt-1">
                    {selectedReview.teacherId?.userId?.name || 'Your Instructor'}
                  </div>
                </div>

                {/* Overall Rating */}
                <div className="text-center py-4 border-b">
                  <div className="text-sm text-gray-600 mb-2">{t('dashboard.reviewModal.overallRating')}</div>
                  <div className="flex justify-center mb-2">
                    {renderStars(calculateAverageRating(selectedReview.ratings), 'lg')}
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-gray-900">
                    {calculateAverageRating(selectedReview.ratings).toFixed(1)} / 5.0
                  </div>
                </div>

                {/* Individual Category Ratings */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-base md:text-lg">{t('dashboard.reviewModal.performanceBreakdown')}</h3>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">{t('dashboard.reviewModal.control')}</span>
                      <div className="flex items-center gap-2">
                        {renderStars(selectedReview.ratings.control, 'sm')}
                        <span className="text-sm text-gray-600 w-8">
                          {selectedReview.ratings.control.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">{t('dashboard.reviewModal.postureAlignment')}</span>
                      <div className="flex items-center gap-2">
                        {renderStars(selectedReview.ratings.postureAlignment, 'sm')}
                        <span className="text-sm text-gray-600 w-8">
                          {selectedReview.ratings.postureAlignment.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">{t('dashboard.reviewModal.strength')}</span>
                      <div className="flex items-center gap-2">
                        {renderStars(selectedReview.ratings.strength, 'sm')}
                        <span className="text-sm text-gray-600 w-8">
                          {selectedReview.ratings.strength.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">{t('dashboard.reviewModal.flexibilityMobility')}</span>
                      <div className="flex items-center gap-2">
                        {renderStars(selectedReview.ratings.flexibilityMobility, 'sm')}
                        <span className="text-sm text-gray-600 w-8">
                          {selectedReview.ratings.flexibilityMobility.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">{t('dashboard.reviewModal.bodyAwarenessFocus')}</span>
                      <div className="flex items-center gap-2">
                        {renderStars(selectedReview.ratings.bodyAwarenessFocus, 'sm')}
                        <span className="text-sm text-gray-600 w-8">
                          {selectedReview.ratings.bodyAwarenessFocus.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedReview.notes && (
                  <div>
                    <h3 className="font-semibold text-base md:text-lg mb-2">{t('dashboard.reviewModal.instructorNotes')}</h3>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
                      {selectedReview.notes}
                    </div>
                  </div>
                )}

                {/* Close Button */}
                <div className="flex justify-end">
                  <Button onClick={() => setIsReviewModalOpen(false)}>{t('dashboard.reviewModal.close')}</Button>
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
