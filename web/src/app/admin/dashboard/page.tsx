'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatStudioTime } from '@/lib/date';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Analytics {
  overview: {
    totalCustomers: number;
    totalTeachers: number;
    totalBookings: number;
    pendingBookings: number;
    upcomingSessions: number;
    activePackages: number;
  };
  thisMonth: {
    packagesSold: number;
    totalSessionsSold: number;
    sessionsCompleted: number;
    revenue: number;
    remainingSessions: number;
  };
  teachers: Array<{
    teacherName: string;
    sessionsCount: number;
  }>;
  topCustomers: Array<{
    customerName: string;
    customerEmail: string;
    sessionsCount: number;
  }>;
}

interface PackageDistribution {
  bySessionCount: Array<{
    sessions: number;
    count: number;
    revenue: number;
  }>;
  byType: Array<{
    type: string;
    count: number;
    revenue: number;
  }>;
  bySessionAndType: Record<number, Record<string, { count: number; revenue: number }>>;
  mostPopular: {
    sessionCount: {
      sessions: number;
      count: number;
      revenue: number;
    } | null;
    type: {
      type: string;
      count: number;
      revenue: number;
    } | null;
  };
  total: number;
}

interface Booking {
  _id: string;
  customerId: {
    userId: {
      name: string;
      email: string;
    };
  };
  teacherId: {
    userId: {
      name: string;
    };
  };
  startTime: string;
  endTime: string;
  type: string;
  status: string;
  notes?: string;
}

interface Demographics {
  totalCustomers: number;
  ageDistribution: Array<{ ageRange: string; count: number }>;
  genderDistribution: Array<{ gender: string; count: number }>;
  professionDistribution: Array<{ profession: string; count: number }>;
}

// Color palettes for charts
const AGE_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#14b8a6', '#6366f1'];
const GENDER_COLORS = {
  male: '#3b82f6',
  female: '#ec4899',
  other: '#8b5cf6',
  unknown: '#9ca3af',
};
const PROFESSION_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'];

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [packageDistribution, setPackageDistribution] = useState<PackageDistribution | null>(null);
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [demographics, setDemographics] = useState<Demographics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch analytics
      const analyticsData = await apiClient.get('/admin/analytics');
      setAnalytics(analyticsData);

      // Fetch package distribution
      const distributionData = await apiClient.get('/admin/package-distribution');
      setPackageDistribution(distributionData);

      // Fetch customer demographics
      const demographicsData = await apiClient.get('/admin/customer-demographics');
      setDemographics(demographicsData);

      // Fetch pending bookings
      const pendingResponse = await apiClient.get('/bookings', {
        params: { status: 'pending' },
      });
      setPendingBookings(pendingResponse.bookings || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (bookingId: string) => {
    try {
      await apiClient.patch(`/bookings/${bookingId}/confirm`);
      alert('Booking confirmed successfully!');
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to confirm booking');
    }
  };

  const handleReject = async (bookingId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      await apiClient.patch(`/bookings/${bookingId}/reject`, { reason });
      alert('Booking rejected');
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to reject booking');
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!analytics) {
    return <div className="container mx-auto px-4 py-8">Failed to load analytics</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-5 gap-4 mb-8">
        <Link href="/admin/customers">
          <Card className="cursor-pointer hover:shadow-lg transition">
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{analytics.overview.totalCustomers}</p>
              <p className="text-sm text-gray-600">View All Customers</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/teachers">
          <Card className="cursor-pointer hover:shadow-lg transition">
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{analytics.overview.totalTeachers}</p>
              <p className="text-sm text-gray-600">Manage Teachers</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/bookings">
          <Card className="cursor-pointer hover:shadow-lg transition">
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{analytics.overview.pendingBookings}</p>
              <p className="text-sm text-gray-600">Pending Requests</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/package-requests">
          <Card className="cursor-pointer hover:shadow-lg transition bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6">
              <p className="text-2xl font-bold text-yellow-700">NEW</p>
              <p className="text-sm text-gray-600">Package Requests</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/calendar">
          <Card className="cursor-pointer hover:shadow-lg transition">
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{analytics.overview.upcomingSessions}</p>
              <p className="text-sm text-gray-600">Upcoming (7 days)</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* This Month Overview */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>This Month's Overview</CardTitle>
          <CardDescription>Performance metrics for the current month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-5 gap-6">
            <div>
              <p className="text-3xl font-bold text-primary-600">{analytics.thisMonth.packagesSold}</p>
              <p className="text-sm text-gray-600">Packages Sold</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-blue-600">{analytics.thisMonth.totalSessionsSold}</p>
              <p className="text-sm text-gray-600">Sessions Sold</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">{analytics.thisMonth.sessionsCompleted}</p>
              <p className="text-sm text-gray-600">Sessions Completed</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-orange-600">{analytics.thisMonth.remainingSessions}</p>
              <p className="text-sm text-gray-600">Sessions Remaining</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-emerald-600">฿{analytics.thisMonth.revenue.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Total Revenue</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Package Distribution Analytics */}
      {packageDistribution && (
        <>
          {/* Grouped Bar Chart */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Package Distribution Chart</CardTitle>
              <CardDescription>Visual breakdown by session count and type</CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                // Prepare data for grouped bar chart
                const sessionCounts = [10, 20, 30];
                const types = [
                  { key: 'private', label: 'Private', color: 'bg-blue-500' },
                  { key: 'duo', label: 'Duo', color: 'bg-green-500' },
                  { key: 'group', label: 'Group', color: 'bg-purple-500' },
                ];

                // Calculate max value for scaling
                let maxCount = 1;
                sessionCounts.forEach(sessionCount => {
                  types.forEach(type => {
                    const count = packageDistribution.bySessionAndType[sessionCount]?.[type.key]?.count || 0;
                    if (count > maxCount) maxCount = count;
                  });
                });

                const maxHeight = 180; // pixels

                return (
                  <div className="space-y-6">
                    {/* Chart */}
                    <div className="flex items-end justify-around gap-8 h-72 px-4">
                      {sessionCounts.map(sessionCount => {
                        const sessionData = packageDistribution.bySessionAndType[sessionCount];

                        return (
                          <div key={sessionCount} className="flex-1 flex flex-col items-center">
                            {/* Grouped bars */}
                            <div className="w-full flex justify-center items-end gap-1 mb-2">
                              {types.map(type => {
                                const typeData = sessionData?.[type.key];
                                const count = typeData?.count || 0;
                                const barHeight = (count / maxCount) * maxHeight;

                                return (
                                  <div key={type.key} className="relative flex-1 max-w-[50px] group">
                                    <div
                                      className={`${type.color} rounded-t transition-all duration-300 hover:opacity-80 cursor-pointer`}
                                      style={{ height: `${Math.max(barHeight, count > 0 ? 20 : 0)}px` }}
                                      title={`${type.label}: ${count} packages`}
                                    >
                                      {count > 0 && (
                                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                          <span className="text-xs font-semibold text-gray-700 bg-white px-1 rounded shadow">
                                            {count}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Labels */}
                            <div className="mt-2 text-center">
                              <p className="text-sm font-semibold text-gray-700">{sessionCount} Sessions</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Total: {types.reduce((sum, type) => sum + (sessionData?.[type.key]?.count || 0), 0)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div className="flex justify-center gap-6 pt-4 border-t">
                      {types.map(type => (
                        <div key={type.key} className="flex items-center gap-2">
                          <div className={`w-4 h-4 ${type.color} rounded`}></div>
                          <span className="text-sm text-gray-600">{type.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Package Distribution by Session Count */}
            <Card>
              <CardHeader>
                <CardTitle>Package Distribution (By Sessions)</CardTitle>
                <CardDescription>Total packages sold: {packageDistribution.total}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {packageDistribution.bySessionCount
                    .sort((a, b) => a.sessions - b.sessions)
                    .map((item, index) => (
                      <div key={index} className="flex items-center justify-between border-b pb-2">
                        <div>
                          <p className="font-medium">{item.sessions} Session Package</p>
                          <p className="text-xs text-gray-500">Revenue: ฿{item.revenue.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary-600">{item.count}</p>
                          <p className="text-xs text-gray-500">sold</p>
                        </div>
                      </div>
                    ))}
                </div>
                {packageDistribution.mostPopular.sessionCount && (
                  <div className="mt-4 pt-4 border-t bg-green-50 p-3 rounded">
                    <p className="text-sm font-semibold text-green-800">Most Popular Package</p>
                    <p className="text-lg font-bold text-green-900">
                      {packageDistribution.mostPopular.sessionCount.sessions} Session Package
                    </p>
                    <p className="text-sm text-green-700">
                      {packageDistribution.mostPopular.sessionCount.count} packages sold
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Package Distribution by Type */}
            <Card>
              <CardHeader>
                <CardTitle>Package Distribution (By Type)</CardTitle>
                <CardDescription>Private, Duo, and Group packages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {packageDistribution.byType.map((item, index) => (
                    <div key={index} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium capitalize">{item.type}</p>
                        <p className="text-xs text-gray-500">Revenue: ฿{item.revenue.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">{item.count}</p>
                        <p className="text-xs text-gray-500">sold</p>
                      </div>
                    </div>
                  ))}
                </div>
                {packageDistribution.mostPopular.type && (
                  <div className="mt-4 pt-4 border-t bg-blue-50 p-3 rounded">
                    <p className="text-sm font-semibold text-blue-800">Most Popular Type</p>
                    <p className="text-lg font-bold text-blue-900 capitalize">
                      {packageDistribution.mostPopular.type.type}
                    </p>
                    <p className="text-sm text-blue-700">
                      {packageDistribution.mostPopular.type.count} packages sold
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Customer Demographics Analytics */}
      {demographics && (
        <>
          <h2 className="text-2xl font-bold mb-4 mt-8">Customer Demographics</h2>

          {/* Age Distribution - Bar Chart */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Customer Age Distribution</CardTitle>
              <CardDescription>Number of customers by age group</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={demographics.ageDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ageRange" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#3b82f6" name="Customers">
                    {demographics.ageDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={AGE_COLORS[index % AGE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Gender Distribution - Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Gender Distribution</CardTitle>
                <CardDescription>Customer breakdown by gender</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={demographics.genderDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ gender, count, percent }) =>
                        count > 0 ? `${gender}: ${count} (${(percent * 100).toFixed(0)}%)` : ''
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="gender"
                    >
                      {demographics.genderDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={GENDER_COLORS[entry.gender as keyof typeof GENDER_COLORS] || '#9ca3af'}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {demographics.genderDistribution.map((item, index) => (
                    <div key={index} className="flex items-center justify-between border rounded p-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded"
                          style={{
                            backgroundColor: GENDER_COLORS[item.gender as keyof typeof GENDER_COLORS] || '#9ca3af'
                          }}
                        />
                        <span className="text-sm capitalize">{item.gender}</span>
                      </div>
                      <span className="text-sm font-bold">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Profession Distribution - Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Profession Distribution</CardTitle>
                <CardDescription>Customer breakdown by profession category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={demographics.professionDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ profession, count, percent }) =>
                        count > 0 ? `${profession}: ${count}` : ''
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="profession"
                    >
                      {demographics.professionDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PROFESSION_COLORS[index % PROFESSION_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {demographics.professionDistribution.map((item, index) => (
                    <div key={index} className="flex items-center justify-between border-b pb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: PROFESSION_COLORS[index % PROFESSION_COLORS.length] }}
                        />
                        <span className="text-sm">{item.profession}</span>
                      </div>
                      <span className="text-sm font-bold">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Teacher Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Teacher Performance (This Month)</CardTitle>
            <CardDescription>Number of sessions completed by each teacher</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.teachers.length === 0 ? (
              <p className="text-gray-500">No completed sessions this month</p>
            ) : (
              <div className="space-y-3">
                {analytics.teachers.map((teacher, index) => (
                  <div key={index} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{teacher.teacherName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary-600">{teacher.sessionsCount}</p>
                      <p className="text-xs text-gray-500">sessions</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Customers (This Month)</CardTitle>
            <CardDescription>Most active customers by session count</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topCustomers.length === 0 ? (
              <p className="text-gray-500">No customer data for this month</p>
            ) : (
              <div className="space-y-3">
                {analytics.topCustomers.map((customer, index) => (
                  <div key={index} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{customer.customerName}</p>
                      <p className="text-xs text-gray-500">{customer.customerEmail}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">{customer.sessionsCount}</p>
                      <p className="text-xs text-gray-500">sessions</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Booking Requests */}
      {pendingBookings.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Pending Booking Requests ({pendingBookings.length})</CardTitle>
            <CardDescription>Review and confirm customer bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingBookings.map((booking) => (
                <div
                  key={booking._id}
                  className="border rounded-lg p-4 flex items-center justify-between bg-yellow-50"
                >
                  <div>
                    <p className="font-semibold">{booking.customerId.userId.name}</p>
                    <p className="text-sm text-gray-600">
                      Teacher: {booking.teacherId.userId.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatStudioTime(booking.startTime, 'PPP p')}
                    </p>
                    <p className="text-sm text-gray-500">
                      Type: {booking.type} | Duration: 60 mins
                    </p>
                    {booking.notes && (
                      <p className="text-sm text-gray-500 mt-1">Notes: {booking.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleConfirm(booking._id)} size="sm">
                      Confirm
                    </Button>
                    <Button
                      onClick={() => handleReject(booking._id)}
                      variant="outline"
                      size="sm"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Stats */}
      <Card>
        <CardHeader>
          <CardTitle>System Statistics</CardTitle>
          <CardDescription>Overall platform metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-4xl font-bold text-gray-800">{analytics.overview.totalBookings}</p>
              <p className="text-sm text-gray-600 mt-2">Total Bookings (All Time)</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-4xl font-bold text-gray-800">{analytics.overview.activePackages}</p>
              <p className="text-sm text-gray-600 mt-2">Active Packages</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-4xl font-bold text-gray-800">{analytics.overview.upcomingSessions}</p>
              <p className="text-sm text-gray-600 mt-2">Upcoming Sessions (Next 7 Days)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
