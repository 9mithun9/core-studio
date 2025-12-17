'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatStudioTime } from '@/lib/date';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ComposedChart } from 'recharts';

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

// New Analytics Interfaces
interface ExecutiveOverview {
  totalRevenue: number;
  revenueGrowth: number;
  activeCustomers: number;
  averageRevenuePerUser: number;
  sessionCompletionRate: number;
  lastMonthRevenue: number;
  activeCustomersLastMonth: number;
}

interface RevenueOperations {
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  revenueByType: Array<{ type: string; revenue: number; sessions: number }>;
  sessionsSoldVsCompleted: Array<{ month: string; sold: number; completed: number }>;
}

interface CustomerIntelligence {
  newVsReturning: Array<{ month: string; new: number; returning: number }>;
  genderDistribution: Array<{ gender: string; count: number }>;
  ageDistribution: Array<{ ageRange: string; count: number }>;
  churnRate: number;
}

interface MarketingPerformance {
  acquisitionByChannel: Array<{ channel: string; customers: number }>;
  funnelData: Array<{ stage: string; count: number }>;
  cpa: number;
  ltv: number;
  roi: number;
}

interface RetentionInsights {
  cohorts: Array<{
    cohort: string;
    month0: number;
    month1: number;
    month2: number;
    month3: number;
    month4: number;
    month5: number;
  }>;
  ltvOverTime: Array<{ month: string; ltv: number }>;
  peakUsage: Array<{ day: string; hour: number; sessions: number }>;
  purchaseTimeDistribution: Array<{ range: string; count: number }>;
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

  // New analytics states
  const [executiveOverview, setExecutiveOverview] = useState<ExecutiveOverview | null>(null);
  const [revenueOps, setRevenueOps] = useState<RevenueOperations | null>(null);
  const [customerIntel, setCustomerIntel] = useState<CustomerIntelligence | null>(null);
  const [marketingPerf, setMarketingPerf] = useState<MarketingPerformance | null>(null);
  const [retentionInsights, setRetentionInsights] = useState<RetentionInsights | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch analytics
      const analyticsData: any = await apiClient.get('/admin/analytics');
      setAnalytics(analyticsData);

      // Fetch package distribution
      const distributionData: any = await apiClient.get('/admin/package-distribution');
      setPackageDistribution(distributionData);

      // Fetch customer demographics
      const demographicsData: any = await apiClient.get('/admin/customer-demographics');
      setDemographics(demographicsData);

      // Fetch pending bookings
      const pendingResponse: any = await apiClient.get('/bookings', {
        params: { status: 'pending' },
      });
      setPendingBookings(pendingResponse.bookings || []);

      // Fetch new comprehensive analytics
      const executiveData: any = await apiClient.get('/admin/analytics/executive-overview');
      setExecutiveOverview(executiveData);

      const revenueOpsData: any = await apiClient.get('/admin/analytics/revenue-operations');
      setRevenueOps(revenueOpsData);

      const customerIntelData: any = await apiClient.get('/admin/analytics/customer-intelligence');
      setCustomerIntel(customerIntelData);

      const marketingPerfData: any = await apiClient.get('/admin/analytics/marketing-performance');
      setMarketingPerf(marketingPerfData);

      const retentionData: any = await apiClient.get('/admin/analytics/retention-insights');
      setRetentionInsights(retentionData);
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
                      label={(props: any) =>
                        props.count > 0 ? `${props.gender}: ${props.count} (${(props.percent * 100).toFixed(0)}%)` : ''
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
                      label={(props: any) =>
                        props.count > 0 ? `${props.profession}: ${props.count}` : ''
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

      {/* ========== SECTION 1: EXECUTIVE OVERVIEW ========== */}
      {executiveOverview && (
        <>
          <div className="mt-12 mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Executive Overview</h2>
            <p className="text-gray-600 mt-1">Key performance indicators and business health metrics</p>
          </div>

          <div className="grid md:grid-cols-5 gap-6 mb-8">
            {/* Total Revenue KPI */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-blue-700">Total Revenue</p>
                  {executiveOverview.revenueGrowth !== 0 && (
                    <span className={`text-xs font-semibold ${executiveOverview.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {executiveOverview.revenueGrowth > 0 ? '↑' : '↓'} {Math.abs(executiveOverview.revenueGrowth).toFixed(1)}%
                    </span>
                  )}
                </div>
                <p className="text-3xl font-bold text-blue-900">฿{executiveOverview.totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-blue-600 mt-1">This month</p>
              </CardContent>
            </Card>

            {/* Revenue Growth KPI */}
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-green-700 mb-2">Revenue Growth</p>
                <p className="text-3xl font-bold text-green-900">
                  {executiveOverview.revenueGrowth > 0 ? '+' : ''}{executiveOverview.revenueGrowth.toFixed(1)}%
                </p>
                <p className="text-xs text-green-600 mt-1">Month-over-month</p>
              </CardContent>
            </Card>

            {/* Active Customers KPI */}
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-purple-700">Active Customers</p>
                  {executiveOverview.activeCustomersLastMonth > 0 && (
                    <span className={`text-xs font-semibold ${executiveOverview.activeCustomers >= executiveOverview.activeCustomersLastMonth ? 'text-green-600' : 'text-red-600'}`}>
                      {executiveOverview.activeCustomers >= executiveOverview.activeCustomersLastMonth ? '↑' : '↓'}
                      {Math.abs(executiveOverview.activeCustomers - executiveOverview.activeCustomersLastMonth)}
                    </span>
                  )}
                </div>
                <p className="text-3xl font-bold text-purple-900">{executiveOverview.activeCustomers}</p>
                <p className="text-xs text-purple-600 mt-1">This month</p>
              </CardContent>
            </Card>

            {/* ARPU KPI */}
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-orange-700 mb-2">Avg Revenue Per User</p>
                <p className="text-3xl font-bold text-orange-900">฿{(executiveOverview.averageRevenuePerUser || 0).toLocaleString()}</p>
                <p className="text-xs text-orange-600 mt-1">ARPU</p>
              </CardContent>
            </Card>

            {/* Session Completion Rate KPI */}
            <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-teal-700 mb-2">Completion Rate</p>
                <p className="text-3xl font-bold text-teal-900">{(executiveOverview.sessionCompletionRate || 0).toFixed(1)}%</p>
                <p className="text-xs text-teal-600 mt-1">Sessions completed</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ========== SECTION 2: REVENUE & OPERATIONS ========== */}
      {revenueOps && (
        <>
          <div className="mt-12 mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Revenue & Operations Performance</h2>
            <p className="text-gray-600 mt-1">Financial trends and operational metrics</p>
          </div>

          {/* Monthly Revenue Trend */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Monthly Revenue Trend</CardTitle>
              <CardDescription>Revenue over the last 12 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={revenueOps.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `฿${Number(value).toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue (฿)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Revenue by Package Type */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Package Type</CardTitle>
                <CardDescription>Breakdown by private, duo, and group sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueOps.revenueByType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip formatter={(value) => `฿${Number(value).toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#10b981" name="Revenue (฿)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Sessions Sold vs Completed */}
            <Card>
              <CardHeader>
                <CardTitle>Sessions: Sold vs Completed</CardTitle>
                <CardDescription>Last 6 months comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueOps.sessionsSoldVsCompleted}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sold" fill="#3b82f6" name="Sessions Sold" />
                    <Bar dataKey="completed" fill="#10b981" name="Sessions Completed" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ========== SECTION 3: CUSTOMER INTELLIGENCE ========== */}
      {customerIntel && (
        <>
          <div className="mt-12 mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Customer Intelligence & Demographics</h2>
            <p className="text-gray-600 mt-1">Customer behavior and demographic insights</p>
          </div>

          {/* New vs Returning Customers */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>New vs Returning Customers</CardTitle>
              <CardDescription>Customer acquisition and retention over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={customerIntel.newVsReturning}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="new" fill="#3b82f6" name="New Customers" stackId="a" />
                  <Bar dataKey="returning" fill="#10b981" name="Returning Customers" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* Churn Rate */}
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardHeader>
                <CardTitle className="text-red-900">Churn Rate</CardTitle>
                <CardDescription>Customers inactive for 3+ months</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-5xl font-bold text-red-900">{customerIntel.churnRate.toFixed(1)}%</p>
              </CardContent>
            </Card>

            {/* Gender Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Gender Distribution</CardTitle>
                <CardDescription>Customer gender breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={customerIntel.genderDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(props: any) => props.count > 0 ? `${props.gender}: ${props.count}` : ''}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="gender"
                    >
                      {customerIntel.genderDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={GENDER_COLORS[entry.gender as keyof typeof GENDER_COLORS] || '#9ca3af'}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Age Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Age Distribution</CardTitle>
                <CardDescription>Customer age breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={customerIntel.ageDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="ageRange" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6">
                      {customerIntel.ageDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={AGE_COLORS[index % AGE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ========== SECTION 4: MARKETING & ACQUISITION ========== */}
      {marketingPerf && (
        <>
          <div className="mt-12 mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Marketing & Acquisition Performance</h2>
            <p className="text-gray-600 mt-1">Marketing effectiveness and customer acquisition metrics</p>
          </div>

          {/* Marketing KPIs */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
              <CardHeader>
                <CardTitle className="text-indigo-900">Cost Per Acquisition</CardTitle>
                <CardDescription>Average cost to acquire a customer</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-indigo-900">฿{marketingPerf.cpa.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
              <CardHeader>
                <CardTitle className="text-emerald-900">Customer Lifetime Value</CardTitle>
                <CardDescription>Average LTV per customer</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-emerald-900">฿{marketingPerf.ltv.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
              <CardHeader>
                <CardTitle className="text-yellow-900">Return on Investment</CardTitle>
                <CardDescription>Marketing ROI ratio</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-yellow-900">{marketingPerf.roi.toFixed(2)}x</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Acquisition by Channel */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Acquisition by Channel</CardTitle>
                <CardDescription>Where your customers are coming from</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={marketingPerf.acquisitionByChannel}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="channel" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="customers" fill="#8b5cf6" name="Customers" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Conversion Funnel */}
            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
                <CardDescription>Customer journey from awareness to booking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {marketingPerf.funnelData.map((stage, index) => {
                    const maxCount = Math.max(...marketingPerf.funnelData.map(s => s.count));
                    const percentage = (stage.count / maxCount) * 100;
                    const conversionRate = index > 0
                      ? ((stage.count / marketingPerf.funnelData[index - 1].count) * 100).toFixed(1)
                      : '100.0';

                    return (
                      <div key={index} className="relative">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
                          <span className="text-sm text-gray-600">{stage.count} ({conversionRate}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-8">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                            style={{ width: `${percentage}%` }}
                          >
                            {percentage.toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ========== SECTION 5: RETENTION & ENGAGEMENT ========== */}
      {retentionInsights && (
        <>
          <div className="mt-12 mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Retention, Engagement & Growth Insights</h2>
            <p className="text-gray-600 mt-1">Long-term customer value and engagement patterns</p>
          </div>

          {/* Cohort Retention Analysis */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Cohort Retention Analysis</CardTitle>
              <CardDescription>Customer retention by signup month (% of original cohort still active)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-semibold">Cohort</th>
                      <th className="text-center p-2 font-semibold">Month 0</th>
                      <th className="text-center p-2 font-semibold">Month 1</th>
                      <th className="text-center p-2 font-semibold">Month 2</th>
                      <th className="text-center p-2 font-semibold">Month 3</th>
                      <th className="text-center p-2 font-semibold">Month 4</th>
                      <th className="text-center p-2 font-semibold">Month 5</th>
                    </tr>
                  </thead>
                  <tbody>
                    {retentionInsights.cohorts.map((cohort, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{cohort.cohort}</td>
                        <td className="text-center p-2">
                          <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-800 font-semibold">
                            {cohort.month0}%
                          </span>
                        </td>
                        <td className="text-center p-2">
                          <span className={`inline-block px-2 py-1 rounded font-semibold ${
                            cohort.month1 >= 80 ? 'bg-green-100 text-green-800' :
                            cohort.month1 >= 60 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {cohort.month1}%
                          </span>
                        </td>
                        <td className="text-center p-2">
                          <span className={`inline-block px-2 py-1 rounded font-semibold ${
                            cohort.month2 >= 70 ? 'bg-green-100 text-green-800' :
                            cohort.month2 >= 50 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {cohort.month2}%
                          </span>
                        </td>
                        <td className="text-center p-2">
                          <span className={`inline-block px-2 py-1 rounded font-semibold ${
                            cohort.month3 >= 60 ? 'bg-green-100 text-green-800' :
                            cohort.month3 >= 40 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {cohort.month3}%
                          </span>
                        </td>
                        <td className="text-center p-2">
                          <span className={`inline-block px-2 py-1 rounded font-semibold ${
                            cohort.month4 >= 50 ? 'bg-green-100 text-green-800' :
                            cohort.month4 >= 30 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {cohort.month4}%
                          </span>
                        </td>
                        <td className="text-center p-2">
                          <span className={`inline-block px-2 py-1 rounded font-semibold ${
                            cohort.month5 >= 40 ? 'bg-green-100 text-green-800' :
                            cohort.month5 >= 20 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {cohort.month5}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* LTV Over Time */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Lifetime Value Trend</CardTitle>
                <CardDescription>Average LTV over the last 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={retentionInsights.ltvOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `฿${Number(value).toLocaleString()}`} />
                    <Legend />
                    <Area type="monotone" dataKey="ltv" stroke="#10b981" fill="#10b98150" name="LTV (฿)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Time to First Purchase */}
            <Card>
              <CardHeader>
                <CardTitle>Time to First Purchase</CardTitle>
                <CardDescription>Days from signup to first package purchase</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={retentionInsights.purchaseTimeDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#f59e0b" name="Customers" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Peak Usage Heatmap */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Peak Usage Heatmap</CardTitle>
              <CardDescription>Session bookings by day and hour</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="grid grid-cols-25 gap-1 text-xs">
                  {/* Header row */}
                  <div className="col-span-1"></div>
                  {Array.from({ length: 24 }, (_, i) => (
                    <div key={i} className="text-center font-semibold text-gray-600">
                      {i}h
                    </div>
                  ))}

                  {/* Data rows */}
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <React.Fragment key={day}>
                      <div className="font-semibold text-gray-600 flex items-center">
                        {day}
                      </div>
                      {Array.from({ length: 24 }, (_, hour) => {
                        const dataPoint = retentionInsights.peakUsage.find(
                          p => p.day === day && p.hour === hour
                        );
                        const sessions = dataPoint?.sessions || 0;
                        const maxSessions = Math.max(...retentionInsights.peakUsage.map(p => p.sessions));
                        const intensity = maxSessions > 0 ? (sessions / maxSessions) * 100 : 0;

                        let bgColor = 'bg-gray-100';
                        if (intensity > 75) bgColor = 'bg-green-600';
                        else if (intensity > 50) bgColor = 'bg-green-400';
                        else if (intensity > 25) bgColor = 'bg-green-200';
                        else if (intensity > 0) bgColor = 'bg-green-100';

                        return (
                          <div
                            key={`${day}-${hour}`}
                            className={`${bgColor} h-8 flex items-center justify-center rounded cursor-pointer hover:ring-2 hover:ring-primary-500`}
                            title={`${day} ${hour}:00 - ${sessions} sessions`}
                          >
                            {sessions > 0 && <span className="text-xs font-semibold">{sessions}</span>}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
