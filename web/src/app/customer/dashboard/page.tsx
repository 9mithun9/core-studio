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

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Hero Section & Next Session Row */}
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
        {overview.upcomingBookings && overview.upcomingBookings.length > 0 ? (
          <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-6 md:p-8 text-white overflow-hidden shadow-2xl">
            {/* Animated background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-400 rounded-full opacity-20 animate-pulse"></div>
              <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-indigo-400 rounded-full opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            {(() => {
              const nextBooking = overview.upcomingBookings[0];
              return (
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
              );
            })()}
          </div>
        ) : (
          <div className="relative bg-gray-100 rounded-2xl p-6 md:p-8 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm md:text-base font-medium mb-2">No Upcoming Sessions</p>
              <Link href="/customer/calendar">
                <Button size="sm" variant="outline">Book a Session</Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Package Status Banners */}
      {(() => {
        const now = new Date();
        // Consider a package active if status is 'active' AND validTo is in the future AND has remaining sessions
        const activePackages = allPackages.filter(
          (p) => p.status === 'active' &&
                 new Date(p.validTo) > now &&
                 (p.remainingUnbooked ?? p.availableForBooking ?? p.remainingSessions) > 0
        );
        // Consider a package expired if status is 'expired' OR validTo has passed OR no remaining sessions
        const expiredPackages = allPackages.filter(
          (p) => p.status === 'expired' ||
                 new Date(p.validTo) <= now ||
                 (p.remainingUnbooked ?? p.availableForBooking ?? p.remainingSessions) <= 0
        );
        const lowSessionPackages = activePackages.filter(
          (p) => (p.remainingUnbooked ?? p.availableForBooking ?? p.remainingSessions) <= 2 &&
                 (p.remainingUnbooked ?? p.availableForBooking ?? p.remainingSessions) > 0
        );
        const noActivePackage = activePackages.length === 0;

        // Priority 1: No active packages (all expired or no packages at all)
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

        // Priority 2: Low sessions warning
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg md:text-xl">{t('dashboard.myPackages.title')}</CardTitle>
                  <CardDescription className="text-xs md:text-sm">{t('dashboard.myPackages.description')}</CardDescription>
                </div>
                {(() => {
                  const now = new Date();
                  const hasActivePackage = allPackages.some(
                    p => p.status === 'active' &&
                         new Date(p.validTo) > now &&
                         (p.remainingUnbooked ?? p.availableForBooking ?? p.remainingSessions) > 0
                  );
                  return (
                    <Button
                      size="sm"
                      variant={hasActivePackage ? "outline" : "default"}
                      onClick={() => setShowRequestModal(true)}
                      className={!hasActivePackage ? "bg-primary-600 hover:bg-primary-700 text-white animate-pulse" : ""}
                    >
                      {hasActivePackage ? t('dashboard.myPackages.addRenew') : t('dashboard.myPackages.requestPackage')}
                    </Button>
                  );
                })()}
              </div>
            </CardHeader>
            <CardContent>
              {allPackages.length > 0 ? (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {allPackages.map((pkg) => (
                    <button
                      key={pkg._id}
                      onClick={() => selectPackage(pkg)}
                      className={`w-full text-left p-3 md:p-4 rounded-lg border-2 transition ${
                        selectedPackage?._id === pkg._id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-sm mb-1">{pkg.name}</div>
                          <div className="text-xs text-gray-600 capitalize mb-2">
                            {pkg.type} {t('dashboard.myPackages.type')}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="text-lg font-bold text-primary-600">
                                {pkg.remainingUnbooked ?? pkg.availableForBooking ?? pkg.remainingSessions}
                              </div>
                              <div className="text-xs text-gray-500">
                                / {pkg.totalSessions} {t('dashboard.myPackages.remaining')}
                              </div>
                            </div>
                          </div>
                        </div>
                        <span
                          className={`inline-flex px-2 py-1 rounded text-xs font-medium capitalize ${
                            pkg.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : pkg.status === 'expired'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {pkg.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        {t('dashboard.myPackages.validUntil')} {formatStudioTime(pkg.validTo, 'MMM d, yyyy')}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="mb-4">
                    <svg className="mx-auto w-16 h-16 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <p className="text-base md:text-lg font-medium text-gray-700 mb-2">{t('dashboard.myPackages.noPackages')}</p>
                    <p className="text-xs md:text-sm text-gray-500 mb-6">{t('dashboard.myPackages.noPackagesMessage')}</p>
                  </div>
                  <Button
                    onClick={() => setShowRequestModal(true)}
                    className="bg-primary-600 hover:bg-primary-700 text-white"
                  >
                    {t('dashboard.myPackages.requestFirst')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Package Details and Session History */}
        <div className="lg:col-span-2">
          {selectedPackage ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">{t('dashboard.packageDetails.title')}</CardTitle>
                <CardDescription className="text-xs md:text-sm">{selectedPackage.name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Package Stats */}
                <div className="grid grid-cols-4 gap-2 md:gap-4 p-3 md:p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-primary-600">
                      {selectedPackage.totalSessions}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{t('dashboard.packageDetails.total')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-green-600">
                      {selectedPackage.completedCount || 0}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{t('dashboard.packageDetails.completed')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-blue-600">
                      {selectedPackage.upcomingCount || 0}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{t('dashboard.packageDetails.upcoming')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-orange-600">
                      {selectedPackage.remainingUnbooked ?? selectedPackage.availableForBooking ?? 0}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{t('dashboard.myPackages.remaining')}</div>
                  </div>
                </div>

                {/* Package Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">{t('dashboard.packageDetails.type')}</span>
                    <span className="font-medium capitalize">{selectedPackage.type}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">{t('dashboard.packageDetails.validFrom')}</span>
                    <span className="font-medium">
                      {formatStudioTime(selectedPackage.validFrom, 'PPP')}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">{t('dashboard.packageDetails.validUntil')}</span>
                    <span className="font-medium">
                      {formatStudioTime(selectedPackage.validTo, 'PPP')}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">{t('dashboard.packageDetails.status')}</span>
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
                  <h3 className="font-semibold text-base md:text-lg mb-3">{t('dashboard.packageDetails.sessionHistory')}</h3>
                  {packageSessions.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {packageSessions
                        .sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                        .map((session: any) => (
                          <div
                            key={session._id}
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg hover:bg-gray-50 gap-3"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {formatStudioTime(session.startTime, 'EEEE, MMM d, yyyy')}
                              </div>
                              <div className="text-xs text-gray-600">
                                {formatStudioTime(session.startTime, 'p')} -{' '}
                                {formatStudioTime(session.endTime, 'p')}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {t('dashboard.nextSession.with')} {session.teacherId?.userId?.name || 'Instructor'}
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
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm md:text-base">{t('dashboard.packageDetails.noSessions')}</p>
                      {selectedPackage.status === 'active' && (
                        <Link href="/customer/calendar">
                          <Button variant="outline" size="sm" className="mt-3">
                            {t('dashboard.packageDetails.bookFirst')}
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <p className="text-sm md:text-base">{t('dashboard.packageDetails.selectPackage')}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Package Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold">{t('dashboard.requestModal.title')}</h2>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Package Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('dashboard.requestModal.packageType')}
                </label>
                <select
                  value={requestForm.packageType}
                  onChange={(e) => setRequestForm({ ...requestForm, packageType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="private">{t('packages.private')}</option>
                  <option value="duo">{t('packages.duo')}</option>
                  <option value="group">{t('packages.group')}</option>
                </select>
              </div>

              {/* Number of Sessions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('dashboard.requestModal.sessions')}
                </label>
                <select
                  value={requestForm.sessions}
                  onChange={(e) => setRequestForm({ ...requestForm, sessions: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value={1}>{t('dashboard.requestModal.sessions1')}</option>
                  <option value={5}>{t('dashboard.requestModal.sessions5')}</option>
                  <option value={10}>{t('dashboard.requestModal.sessions10')}</option>
                  <option value={20}>{t('dashboard.requestModal.sessions20')}</option>
                  <option value={30}>{t('dashboard.requestModal.sessions30')}</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('dashboard.requestModal.notes')}
                </label>
                <textarea
                  value={requestForm.notes}
                  onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                  placeholder={t('dashboard.requestModal.notesPlaceholder')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1"
                >
                  {t('dashboard.requestModal.cancel')}
                </Button>
                <Button
                  onClick={handleRequestPackage}
                  className="flex-1"
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
