'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatStudioTime } from '@/lib/date';

export default function CustomerDashboard() {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    try {
      const data = await apiClient.get('/customers/me/overview');
      setOverview(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load overview');
    } finally {
      setLoading(false);
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

  const activePackage = overview.activePackages?.[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {overview.customer?.userId?.name}!</h1>
        <p className="text-gray-600 mt-2">Here's your Pilates journey</p>
      </div>

      {/* Current Package */}
      <Card>
        <CardHeader>
          <CardTitle>Current Package</CardTitle>
          <CardDescription>Your active session package</CardDescription>
        </CardHeader>
        <CardContent>
          {activePackage ? (
            <div>
              <div className="flex items-baseline gap-3 mb-4">
                <div className="text-4xl font-bold text-primary-600">
                  {activePackage.remainingSessions}
                </div>
                <div className="text-gray-600">
                  / {activePackage.totalSessions} sessions left
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Package:</span>
                  <span className="font-medium">{activePackage.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium capitalize">{activePackage.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valid until:</span>
                  <span className="font-medium">
                    {formatStudioTime(activePackage.validTo, 'PPP')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span
                    className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                      activePackage.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {activePackage.status}
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <Link href="/customer/calendar">
                  <Button className="w-full">Book a Session</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">You don't have any active packages</p>
              <p className="text-sm text-gray-500 mb-4">
                Contact the studio to purchase a package and start your Pilates journey
              </p>
              <Button variant="outline">Contact Studio</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Upcoming Sessions</CardTitle>
              <CardDescription>Your scheduled Pilates sessions</CardDescription>
            </div>
            <Link href="/customer/calendar">
              <Button variant="outline" size="sm">
                Book New
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {overview.upcomingBookings && overview.upcomingBookings.length > 0 ? (
            <div className="space-y-4">
              {overview.upcomingBookings.map((booking: any) => (
                <div
                  key={booking._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <div className="font-medium">
                      {formatStudioTime(booking.startTime, 'EEEE, MMM d')}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatStudioTime(booking.startTime, 'p')} -{' '}
                      {formatStudioTime(booking.endTime, 'p')}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      with {booking.teacherId?.userId?.name || 'Instructor'}
                    </div>
                  </div>
                  <div>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No upcoming sessions</p>
              <Link href="/customer/calendar">
                <Button variant="outline" className="mt-4">
                  Schedule Your First Session
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sessions Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary-600">
              {overview.stats?.completedSessions || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Packages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary-600">
              {overview.activePackages?.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/customer/calendar">
              <Button variant="outline" size="sm" className="w-full">
                Book Session
              </Button>
            </Link>
            <Link href="/customer/history">
              <Button variant="outline" size="sm" className="w-full">
                View History
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
