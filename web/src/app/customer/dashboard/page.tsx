'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatStudioTime } from '@/lib/date';
import toast, { Toaster } from 'react-hot-toast';

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [overviewData, packagesData] = await Promise.all([
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
      const bookings = await apiClient.get('/bookings/me');
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
          const response = await apiClient.get(`/reviews/booking/${booking._id}`);
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
    const loadingToast = toast.loading('Submitting package request...');

    try {
      await apiClient.post('/package-requests/request', requestForm);
      toast.success('Package request submitted successfully! Waiting for admin approval.', {
        id: loadingToast,
        duration: 4000,
      });
      setShowRequestModal(false);
      setRequestForm({ packageType: 'private', sessions: 10, notes: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit request', {
        id: loadingToast,
      });
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading your dashboard...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {overview.customer?.userId?.name}!</h1>
          <p className="text-gray-600 mt-2">Here's your Pilates journey</p>
        </div>
        <Link href="/customer/calendar">
          <Button size="lg">Book a Session</Button>
        </Link>
      </div>

      {/* Upcoming Sessions Quick View */}
      {overview.upcomingBookings && overview.upcomingBookings.length > 0 && (
        <Card className="bg-primary-50 border-primary-200">
          <CardHeader>
            <CardTitle className="text-primary-900">Next Session</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const nextBooking = overview.upcomingBookings[0];
              return (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-primary-900">
                      {formatStudioTime(nextBooking.startTime, 'EEEE, MMM d')}
                    </div>
                    <div className="text-lg text-primary-700">
                      {formatStudioTime(nextBooking.startTime, 'p')} with{' '}
                      {nextBooking.teacherId?.userId?.name || 'Instructor'}
                    </div>
                  </div>
                  <span className="inline-flex px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    {nextBooking.status}
                  </span>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Packages and History - Side by Side Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Package List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>My Packages</CardTitle>
                  <CardDescription>All your session packages</CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowRequestModal(true)}
                >
                  Add/Renew Package
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {allPackages.length > 0 ? (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {allPackages.map((pkg) => (
                    <button
                      key={pkg._id}
                      onClick={() => selectPackage(pkg)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition ${
                        selectedPackage?._id === pkg._id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-sm mb-1">{pkg.name}</div>
                          <div className="text-xs text-gray-600 capitalize mb-2">
                            {pkg.type} Sessions
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="text-lg font-bold text-primary-600">
                                {pkg.remainingUnbooked ?? pkg.availableForBooking ?? pkg.remainingSessions}
                              </div>
                              <div className="text-xs text-gray-500">
                                / {pkg.totalSessions} remaining
                              </div>
                            </div>
                          </div>
                        </div>
                        <span
                          className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
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
                        Valid until {formatStudioTime(pkg.validTo, 'MMM d, yyyy')}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-4">No packages yet</p>
                  <Button variant="outline" size="sm">
                    Contact Studio
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
                <CardTitle>Package Details & Session History</CardTitle>
                <CardDescription>{selectedPackage.name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Package Stats */}
                <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary-600">
                      {selectedPackage.totalSessions}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {selectedPackage.completedCount || 0}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {selectedPackage.upcomingCount || 0}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Upcoming</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">
                      {selectedPackage.remainingUnbooked ?? selectedPackage.availableForBooking ?? 0}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Remaining</div>
                  </div>
                </div>

                {/* Package Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium capitalize">{selectedPackage.type}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Valid From:</span>
                    <span className="font-medium">
                      {formatStudioTime(selectedPackage.validFrom, 'PPP')}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Valid Until:</span>
                    <span className="font-medium">
                      {formatStudioTime(selectedPackage.validTo, 'PPP')}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Status:</span>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
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
                  <h3 className="font-semibold text-lg mb-3">Session History</h3>
                  {packageSessions.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {packageSessions
                        .sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                        .map((session: any) => (
                          <div
                            key={session._id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
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
                                with {session.teacherId?.userId?.name || 'Instructor'}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
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
                                  ? 'Cancellation Pending'
                                  : session.status === 'noShow'
                                  ? 'No Show'
                                  : session.status === 'confirmed' && new Date(session.endTime) < new Date()
                                  ? 'Completed'
                                  : session.status === 'completed'
                                  ? 'Completed'
                                  : session.status === 'confirmed'
                                  ? 'Confirmed'
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
                                  <span className="text-xs text-primary-600">View Details</span>
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
                                        className="text-xs cursor-not-allowed opacity-60"
                                        disabled={true}
                                      >
                                        Cannot Cancel
                                      </Button>
                                      <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                                        Cannot cancel within 6 hours of session start time
                                        <div className="absolute top-full right-4 w-2 h-2 bg-gray-900 transform rotate-45 -mt-1"></div>
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs"
                                    onClick={async () => {
                                      const reason = prompt('Reason for cancellation (optional):');
                                      if (reason !== null) {
                                        const loadingToast = toast.loading('Requesting cancellation...');
                                        try {
                                          await apiClient.post(`/bookings/${session._id}/request-cancellation`, {
                                            reason,
                                          });
                                          toast.success('Cancellation requested successfully', {
                                            id: loadingToast,
                                            duration: 3000,
                                          });
                                          loadData();
                                        } catch (err: any) {
                                          toast.error(err.response?.data?.error || 'Failed to request cancellation', {
                                            id: loadingToast,
                                          });
                                        }
                                      }
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                );
                              })()}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No sessions booked with this package yet</p>
                      {selectedPackage.status === 'active' && (
                        <Link href="/customer/calendar">
                          <Button variant="outline" size="sm" className="mt-3">
                            Book Your First Session
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
                <p>Select a package to view details and history</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Package Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Request Package</h2>
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
                  Package Type
                </label>
                <select
                  value={requestForm.packageType}
                  onChange={(e) => setRequestForm({ ...requestForm, packageType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="private">Private</option>
                  <option value="duo">Duo</option>
                  <option value="group">Group</option>
                </select>
              </div>

              {/* Number of Sessions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Sessions
                </label>
                <select
                  value={requestForm.sessions}
                  onChange={(e) => setRequestForm({ ...requestForm, sessions: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value={10}>10 Sessions</option>
                  <option value={20}>20 Sessions</option>
                  <option value={30}>30 Sessions</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={requestForm.notes}
                  onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                  placeholder="Any special requests or comments..."
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
                  Cancel
                </Button>
                <Button
                  onClick={handleRequestPackage}
                  className="flex-1"
                >
                  Submit Request
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
                <DialogTitle className="text-2xl">Session Review</DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Teacher Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Review by</div>
                  <div className="font-semibold text-gray-900 mt-1">
                    {selectedReview.teacherId?.userId?.name || 'Your Instructor'}
                  </div>
                </div>

                {/* Overall Rating */}
                <div className="text-center py-4 border-b">
                  <div className="text-sm text-gray-600 mb-2">Overall Rating</div>
                  <div className="flex justify-center mb-2">
                    {renderStars(calculateAverageRating(selectedReview.ratings), 'lg')}
                  </div>
                  <div className="text-3xl font-bold text-gray-900">
                    {calculateAverageRating(selectedReview.ratings).toFixed(1)} / 5.0
                  </div>
                </div>

                {/* Individual Category Ratings */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Performance Breakdown</h3>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Control</span>
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
                      <span className="text-sm font-medium text-gray-700">Posture & Alignment</span>
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
                      <span className="text-sm font-medium text-gray-700">Strength</span>
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
                      <span className="text-sm font-medium text-gray-700">Flexibility / Mobility</span>
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
                      <span className="text-sm font-medium text-gray-700">Body Awareness / Focus</span>
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
                    <h3 className="font-semibold text-lg mb-2">Instructor Notes</h3>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
                      {selectedReview.notes}
                    </div>
                  </div>
                )}

                {/* Close Button */}
                <div className="flex justify-end">
                  <Button onClick={() => setIsReviewModalOpen(false)}>Close</Button>
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
