'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { apiClient } from '@/lib/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';

interface Analytics {
  overview: {
    totalCustomers: number;
    totalTeachers: number;
    totalBookings: number;
    pendingBookings: number;
    upcomingSessions: number;
  };
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
  revenueByType: Array<{ type: string; revenue: number; count: number }>;
  revenueBySessionCount: Array<{ sessionCount: number; revenue: number; count: number }>;
  sessionsSoldVsCompleted: Array<{ month: string; sold: number; completed: number }>;
}

interface CustomerIntelligence {
  newVsReturning: Array<{ month: string; new: number; returning: number }>;
  genderDistribution: Array<{ gender: string; count: number }>;
  ageDistribution: Array<{ ageRange: string; count: number }>;
  churnRate: number;
}

interface DemographicData {
  genderDistribution: Array<{ gender: string; count: number }>;
  ageDistribution: Array<{ ageRange: string; count: number }>;
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

export default function AdminDashboard() {
  const { t } = useTranslation('admin');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  // New analytics states
  const [executiveOverview, setExecutiveOverview] = useState<ExecutiveOverview | null>(null);
  const [revenueOps, setRevenueOps] = useState<RevenueOperations | null>(null);
  const [customerIntel, setCustomerIntel] = useState<CustomerIntelligence | null>(null);
  const [retentionInsights, setRetentionInsights] = useState<RetentionInsights | null>(null);
  const [genderDemographic, setGenderDemographic] = useState<Array<{ gender: string; count: number }> | null>(null);
  const [ageDemographic, setAgeDemographic] = useState<Array<{ ageRange: string; count: number }> | null>(null);

  // Filter states
  const [ltvFilter, setLtvFilter] = useState<'last6months' | 'last12months' | string>('last6months');
  const [newVsReturningFilter, setNewVsReturningFilter] = useState<'last6months' | 'last12months' | string>('last6months');
  const [cohortFilter, setCohortFilter] = useState<'last6months' | 'last12months' | string>('last6months');
  const [genderFilter, setGenderFilter] = useState<'all' | 'active'>('all');
  const [ageFilter, setAgeFilter] = useState<'all' | 'active'>('all');
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Only fetch retention insights when LTV or cohort filter changes
    if (retentionInsights) {
      fetchRetentionInsights();
    }
  }, [ltvFilter, cohortFilter]);

  useEffect(() => {
    // Only fetch customer intelligence when filter changes
    if (customerIntel) {
      fetchCustomerIntelligence();
    }
  }, [newVsReturningFilter]);

  useEffect(() => {
    // Fetch gender demographic when gender filter changes
    if (genderDemographic) {
      fetchGenderDemographic();
    }
  }, [genderFilter]);

  useEffect(() => {
    // Fetch age demographic when age filter changes
    if (ageDemographic) {
      fetchAgeDemographic();
    }
  }, [ageFilter]);

  const fetchRetentionInsights = async () => {
    try {
      // Build query params for retention insights
      const retentionParams = new URLSearchParams();

      // LTV filter
      if (ltvFilter === 'last6months') {
        retentionParams.append('ltvPeriod', 'last6months');
      } else if (ltvFilter === 'last12months') {
        retentionParams.append('ltvPeriod', 'last12months');
      } else {
        // It's a year filter
        retentionParams.append('ltvYear', ltvFilter);
      }

      // Cohort filter
      if (cohortFilter === 'last6months') {
        retentionParams.append('cohortPeriod', 'last6months');
      } else if (cohortFilter === 'last12months') {
        retentionParams.append('cohortPeriod', 'last12months');
      } else {
        // It's a year filter
        retentionParams.append('cohortYear', cohortFilter);
      }

      const retentionData: any = await apiClient.get(`/admin/analytics/retention-insights?${retentionParams.toString()}`);
      setRetentionInsights(retentionData);
    } catch (error) {
      console.error('Error fetching retention insights:', error);
    }
  };

  const fetchCustomerIntelligence = async () => {
    try {
      // Build query params for customer intelligence
      const params = new URLSearchParams();
      if (newVsReturningFilter === 'last6months') {
        params.append('newVsReturningPeriod', 'last6months');
      } else if (newVsReturningFilter === 'last12months') {
        params.append('newVsReturningPeriod', 'last12months');
      } else {
        // It's a year filter
        params.append('newVsReturningYear', newVsReturningFilter);
      }

      const customerIntelData: any = await apiClient.get(`/admin/analytics/customer-intelligence?${params.toString()}`);
      setCustomerIntel(customerIntelData);
    } catch (error) {
      console.error('Error fetching customer intelligence:', error);
    }
  };

  const fetchGenderDemographic = async () => {
    try {
      const params = new URLSearchParams();
      params.append('demographicFilter', genderFilter);
      const data: any = await apiClient.get(`/admin/analytics/customer-intelligence?${params.toString()}`);
      setGenderDemographic(data.genderDistribution);
    } catch (error) {
      console.error('Error fetching gender demographic:', error);
    }
  };

  const fetchAgeDemographic = async () => {
    try {
      const params = new URLSearchParams();
      params.append('demographicFilter', ageFilter);
      const data: any = await apiClient.get(`/admin/analytics/customer-intelligence?${params.toString()}`);
      setAgeDemographic(data.ageDistribution);
    } catch (error) {
      console.error('Error fetching age demographic:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch basic analytics for quick actions
      const analyticsData: any = await apiClient.get('/admin/analytics');
      setAnalytics(analyticsData);

      // Fetch new comprehensive analytics
      const executiveData: any = await apiClient.get('/admin/analytics/executive-overview');
      setExecutiveOverview(executiveData);

      const revenueOpsData: any = await apiClient.get('/admin/analytics/revenue-operations');
      setRevenueOps(revenueOpsData);

      const customerIntelData: any = await apiClient.get('/admin/analytics/customer-intelligence');
      setCustomerIntel(customerIntelData);

      // Initialize demographic data separately with default "all" filter
      setGenderDemographic(customerIntelData.genderDistribution);
      setAgeDemographic(customerIntelData.ageDistribution);

      // Fetch retention insights with initial filter
      await fetchRetentionInsights();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="text-center text-gray-600">Loading...</div>
    </div>;
  }

  if (!analytics) {
    return <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="text-center text-gray-600">Failed to load analytics</div>
    </div>;
  }

  return (
    <div className="min-h-screen pb-12">
      <div className="container mx-auto px-4 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 max-w-2xl">
          <Link href="/admin/package-requests">
            <div className="relative bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl p-6 text-white overflow-hidden shadow-xl transform hover:scale-105 transition-transform duration-300 cursor-pointer">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-400 rounded-full opacity-20 animate-pulse"></div>
              <div className="relative z-10">
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-20">
                  <p className="text-3xl font-bold mb-2">NEW</p>
                  <p className="text-sm text-yellow-100 font-medium">{t('dashboard.packageRequests')}</p>
                </div>
              </div>
            </div>
          </Link>
          <Link href="/admin/bookings">
            <div className="relative bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white overflow-hidden shadow-xl transform hover:scale-105 transition-transform duration-300 cursor-pointer">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-400 rounded-full opacity-20 animate-pulse"></div>
              <div className="relative z-10">
                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-20">
                  <p className="text-4xl font-bold mb-2">{analytics.overview.pendingBookings}</p>
                  <p className="text-sm text-indigo-100 font-medium">{t('dashboard.pendingRequests')}</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

      {/* ========== SECTION 1: EXECUTIVE OVERVIEW ========== */}
      {executiveOverview && (
        <>
          <div className="mt-8 md:mt-12 mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">{t('dashboard.executiveOverview')}</h2>
            <p className="text-sm md:text-base text-gray-600 mt-1">Key performance indicators and business health metrics</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-6 md:mb-8">
            {/* Total Revenue KPI */}
            <div
              className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-6 md:p-8 text-white overflow-hidden shadow-xl transform hover:scale-105 transition-all duration-300 cursor-help"
              title="Total revenue generated this month from all package sales"
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-400 rounded-full opacity-20 animate-pulse"></div>
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-indigo-400 rounded-full opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium opacity-90">{t('dashboard.totalRevenue')}</p>
                  {executiveOverview.revenueGrowth !== 0 && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${executiveOverview.revenueGrowth > 0 ? 'bg-green-500' : 'bg-red-500'}`}>
                      {executiveOverview.revenueGrowth > 0 ? '↑' : '↓'} {Math.abs(executiveOverview.revenueGrowth).toFixed(1)}%
                    </span>
                  )}
                </div>
                <p className="text-3xl md:text-4xl font-bold mb-1">฿{executiveOverview.totalRevenue.toLocaleString()}</p>
                <p className="text-xs opacity-75">{t('dashboard.thisMonth')}</p>
              </div>
            </div>

            {/* Active Customers KPI */}
            <div
              className="relative bg-gradient-to-br from-purple-600 via-purple-700 to-pink-700 rounded-2xl p-6 md:p-8 text-white overflow-hidden shadow-xl transform hover:scale-105 transition-all duration-300 cursor-help"
              title="Number of customers who had at least one session this month"
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-400 rounded-full opacity-20 animate-pulse"></div>
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-pink-400 rounded-full opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium opacity-90">{t('dashboard.activeCustomers')}</p>
                  {executiveOverview.activeCustomersLastMonth > 0 && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${executiveOverview.activeCustomers >= executiveOverview.activeCustomersLastMonth ? 'bg-green-500' : 'bg-red-500'}`}>
                      {executiveOverview.activeCustomers >= executiveOverview.activeCustomersLastMonth ? '↑' : '↓'}
                      {Math.abs(executiveOverview.activeCustomers - executiveOverview.activeCustomersLastMonth)}
                    </span>
                  )}
                </div>
                <p className="text-3xl md:text-4xl font-bold mb-1">{executiveOverview.activeCustomers}</p>
                <p className="text-xs opacity-75">{t('dashboard.thisMonth')}</p>
              </div>
            </div>

            {/* Session Completion Rate KPI */}
            <div
              className="relative bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-700 rounded-2xl p-6 md:p-8 text-white overflow-hidden shadow-xl transform hover:scale-105 transition-all duration-300 cursor-help"
              title="Percentage of booked sessions that were successfully completed"
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-teal-400 rounded-full opacity-20 animate-pulse"></div>
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-cyan-400 rounded-full opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
              <div className="relative z-10">
                <p className="text-sm font-medium opacity-90 mb-3">{t('dashboard.completionRate')}</p>
                <p className="text-3xl md:text-4xl font-bold mb-1">{(executiveOverview.sessionCompletionRate || 0).toFixed(1)}%</p>
                <p className="text-xs opacity-75">{t('dashboard.sessionsCompleted')}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-6 md:mb-8">
            {/* Revenue Growth KPI */}
            <div
              className="relative bg-gradient-to-br from-green-600 via-green-700 to-emerald-700 rounded-2xl p-6 md:p-8 text-white overflow-hidden shadow-xl transform hover:scale-105 transition-all duration-300 cursor-help"
              title="Percentage change in revenue compared to last month"
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-400 rounded-full opacity-20 animate-pulse"></div>
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-400 rounded-full opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
              <div className="relative z-10">
                <p className="text-sm font-medium opacity-90 mb-3">{t('dashboard.revenueGrowth')}</p>
                <p className="text-3xl md:text-4xl font-bold mb-1">
                  {executiveOverview.revenueGrowth > 0 ? '+' : ''}{executiveOverview.revenueGrowth.toFixed(1)}%
                </p>
                <p className="text-xs opacity-75">{t('dashboard.monthOverMonth')}</p>
              </div>
            </div>

            {/* ARPU KPI */}
            <div
              className="relative bg-gradient-to-br from-orange-600 via-orange-700 to-amber-700 rounded-2xl p-6 md:p-8 text-white overflow-hidden shadow-xl transform hover:scale-105 transition-all duration-300 cursor-help"
              title="Average Revenue Per User - Total revenue divided by active customers"
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-400 rounded-full opacity-20 animate-pulse"></div>
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-amber-400 rounded-full opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
              <div className="relative z-10">
                <p className="text-sm font-medium opacity-90 mb-3">{t('dashboard.avgRevenuePerUser')}</p>
                <p className="text-3xl md:text-4xl font-bold mb-1">฿{(executiveOverview.averageRevenuePerUser || 0).toLocaleString()}</p>
                <p className="text-xs opacity-75">ARPU</p>
              </div>
            </div>

            {/* Churn Rate KPI */}
            {customerIntel && (
              <div
                className="relative bg-gradient-to-br from-red-600 via-red-700 to-rose-700 rounded-2xl p-6 md:p-8 text-white overflow-hidden shadow-xl transform hover:scale-105 transition-all duration-300 cursor-help"
                title="Percentage of customers who have been inactive for 3+ months"
              >
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-400 rounded-full opacity-20 animate-pulse"></div>
                <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-rose-400 rounded-full opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="relative z-10">
                  <p className="text-sm font-medium opacity-90 mb-3">{t('dashboard.churnRate')}</p>
                  <p className="text-3xl md:text-4xl font-bold mb-1">{customerIntel.churnRate.toFixed(1)}%</p>
                  <p className="text-xs opacity-75">{t('dashboard.customersInactive')}</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========== SECTION 2: REVENUE & OPERATIONS ========== */}
      {revenueOps && (
        <>
          <div className="mt-8 md:mt-12 mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">{t('dashboard.revenueOperations')}</h2>
            <p className="text-sm md:text-base text-gray-600 mt-1">{t('dashboard.financialTrends')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
            {/* Revenue by Package Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base md:text-lg">{t('dashboard.revenueByPackageType')}</CardTitle>
                <CardDescription className="text-xs md:text-sm">{t('dashboard.breakdownByType')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueOps.revenueByType}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="type" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip
                      cursor={false}
                      content={({ active, payload, label }: any) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white/80 backdrop-blur-md border-2 border-white/60 rounded-xl shadow-2xl p-4">
                              <p className="font-semibold text-gray-900 mb-2 text-sm">{label}</p>
                              <div className="space-y-1.5">
                                {payload.map((entry: any, index: number) => (
                                  <div key={index} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.fill }} />
                                    <span className="text-sm text-gray-700">
                                      Revenue: <span className="font-semibold text-gray-900">฿{Number(entry.value).toLocaleString()}</span>
                                    </span>
                                  </div>
                                ))}
                                <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600">
                                  {data.count} packages
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ paddingTop: '20px' }}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#f59e0b"
                      name="Revenue (฿)"
                      radius={[6, 6, 0, 0]}
                      shape={(props: any) => (
                        <rect
                          x={props.x}
                          y={props.y}
                          width={props.width}
                          height={props.height}
                          fill="#f59e0b"
                          rx={6}
                          ry={6}
                        />
                      )}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue by Package Size (Session Count) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base md:text-lg">{t('dashboard.revenueByPackageSize')}</CardTitle>
                <CardDescription className="text-xs md:text-sm">{t('dashboard.breakdownBySize')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueOps.revenueBySessionCount}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="sessionCount" label={{ value: 'Sessions', position: 'insideBottom', offset: -5 }} stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip
                      cursor={false}
                      content={({ active, payload, label }: any) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white/80 backdrop-blur-md border-2 border-white/60 rounded-xl shadow-2xl p-4">
                              <p className="font-semibold text-gray-900 mb-2 text-sm">{label} sessions</p>
                              <div className="space-y-1.5">
                                {payload.map((entry: any, index: number) => (
                                  <div key={index} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.fill }} />
                                    <span className="text-sm text-gray-700">
                                      Revenue: <span className="font-semibold text-gray-900">฿{Number(entry.value).toLocaleString()}</span>
                                    </span>
                                  </div>
                                ))}
                                <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600">
                                  {data.count} packages
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ paddingTop: '20px' }}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#8b5cf6"
                      name="Revenue (฿)"
                      radius={[6, 6, 0, 0]}
                      shape={(props: any) => (
                        <rect
                          x={props.x}
                          y={props.y}
                          width={props.width}
                          height={props.height}
                          fill="#8b5cf6"
                          rx={6}
                          ry={6}
                        />
                      )}
                    />
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
          <div className="mt-8 md:mt-12 mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">{t('dashboard.customerIntelligence')}</h2>
            <p className="text-sm md:text-base text-gray-600 mt-1">{t('dashboard.customerBehavior')}</p>
          </div>

          {/* New vs Returning Customers */}
          <Card className="mb-6 md:mb-8">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-base md:text-lg">{t('dashboard.newVsReturning')}</CardTitle>
                  <CardDescription className="text-xs md:text-sm">{t('dashboard.packagePurchases')}</CardDescription>
                </div>
                <Select value={newVsReturningFilter} onValueChange={setNewVsReturningFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last6months">{t('dashboard.last6Months')}</SelectItem>
                    <SelectItem value="last12months">{t('dashboard.last12Months')}</SelectItem>
                    <SelectItem value="2025">{t('dashboard.year2025')}</SelectItem>
                    {currentYear > 2025 && <SelectItem value="2026">{t('dashboard.year2026')}</SelectItem>}
                    {currentYear > 2026 && <SelectItem value="2027">{t('dashboard.year2027')}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={customerIntel.newVsReturning}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload, label }: any) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white/80 backdrop-blur-md border-2 border-white/60 rounded-xl shadow-2xl p-4">
                            <p className="font-semibold text-gray-900 mb-2 text-sm">{label}</p>
                            <div className="space-y-1.5">
                              {payload.map((entry: any, index: number) => (
                                <div key={index} className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.fill }} />
                                  <span className="text-sm text-gray-700">
                                    {entry.name}: <span className="font-semibold text-gray-900">{Number(entry.value).toLocaleString()}</span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ paddingTop: '20px' }}
                  />
                  <Bar
                    dataKey="new"
                    fill="#f59e0b"
                    name={t('dashboard.newCustomers')}
                    stackId="a"
                    radius={[0, 0, 0, 0]}
                    shape={(props: any) => (
                      <rect
                        x={props.x}
                        y={props.y}
                        width={props.width}
                        height={props.height}
                        fill="#f59e0b"
                        rx={6}
                        ry={6}
                      />
                    )}
                  />
                  <Bar
                    dataKey="returning"
                    fill="#8b5cf6"
                    name={t('dashboard.renewals')}
                    stackId="a"
                    radius={[6, 6, 0, 0]}
                    shape={(props: any) => (
                      <rect
                        x={props.x}
                        y={props.y}
                        width={props.width}
                        height={props.height}
                        fill="#8b5cf6"
                        rx={6}
                        ry={6}
                      />
                    )}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
            {/* Gender Distribution */}
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4">
                  <div>
                    <CardTitle className="text-base md:text-lg">{t('dashboard.genderDistribution')}</CardTitle>
                    <CardDescription className="text-xs md:text-sm">{t('dashboard.customerGenderBreakdown')}</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="genderDemographicFilter"
                        value="all"
                        checked={genderFilter === 'all'}
                        onChange={(e) => setGenderFilter(e.target.value as 'all' | 'active')}
                        className="w-4 h-4 text-primary-600"
                      />
                      <span className="text-xs md:text-sm text-gray-700">{t('dashboard.allCustomers')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="genderDemographicFilter"
                        value="active"
                        checked={genderFilter === 'active'}
                        onChange={(e) => setGenderFilter(e.target.value as 'all' | 'active')}
                        className="w-4 h-4 text-primary-600"
                      />
                      <span className="text-xs md:text-sm text-gray-700">{t('dashboard.activeCustomers')}</span>
                    </label>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={genderDemographic || customerIntel.genderDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(props: any) => props.count > 0 ? `${props.gender}: ${props.count}` : ''}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="gender"
                    >
                      {(genderDemographic || customerIntel.genderDistribution).map((entry, index) => (
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
                <div className="flex flex-col gap-4">
                  <div>
                    <CardTitle className="text-base md:text-lg">{t('dashboard.ageDistribution')}</CardTitle>
                    <CardDescription className="text-xs md:text-sm">{t('dashboard.customerAgeBreakdown')}</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="ageDemographicFilter"
                        value="all"
                        checked={ageFilter === 'all'}
                        onChange={(e) => setAgeFilter(e.target.value as 'all' | 'active')}
                        className="w-4 h-4 text-primary-600"
                      />
                      <span className="text-xs md:text-sm text-gray-700">{t('dashboard.allCustomers')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="ageDemographicFilter"
                        value="active"
                        checked={ageFilter === 'active'}
                        onChange={(e) => setAgeFilter(e.target.value as 'all' | 'active')}
                        className="w-4 h-4 text-primary-600"
                      />
                      <span className="text-xs md:text-sm text-gray-700">{t('dashboard.activeCustomers')}</span>
                    </label>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={ageDemographic || customerIntel.ageDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="ageRange" tick={{ fontSize: 10 }} stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip
                      cursor={false}
                      content={({ active, payload, label }: any) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white/80 backdrop-blur-md border-2 border-white/60 rounded-xl shadow-2xl p-4">
                              <p className="font-semibold text-gray-900 mb-2 text-sm">{label}</p>
                              <div className="space-y-1.5">
                                {payload.map((entry: any, index: number) => (
                                  <div key={index} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.fill }} />
                                    <span className="text-sm text-gray-700">
                                      Count: <span className="font-semibold text-gray-900">{Number(entry.value).toLocaleString()}</span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]}>
                      {(ageDemographic || customerIntel.ageDistribution).map((entry, index) => (
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


      {/* ========== SECTION 5: RETENTION & ENGAGEMENT ========== */}
      {retentionInsights && (
        <>
          <div className="mt-8 md:mt-12 mb-4 md:mb-6">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">{t('dashboard.retentionEngagement')}</h2>
            <p className="text-sm md:text-base text-gray-600 mt-1">{t('dashboard.longTermValue')}</p>
          </div>

          {/* Cohort Retention Analysis */}
          <Card className="mb-6 md:mb-8">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-base md:text-lg">{t('dashboard.cohortRetention')}</CardTitle>
                  <CardDescription className="text-xs md:text-sm">{t('dashboard.retentionByMonth')}</CardDescription>
                </div>
                <Select value={cohortFilter} onValueChange={setCohortFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last6months">{t('dashboard.last6Months')}</SelectItem>
                    <SelectItem value="last12months">{t('dashboard.last12Months')}</SelectItem>
                    <SelectItem value="2025">{t('dashboard.year2025')}</SelectItem>
                    {currentYear > 2025 && <SelectItem value="2026">{t('dashboard.year2026')}</SelectItem>}
                    {currentYear > 2026 && <SelectItem value="2027">{t('dashboard.year2027')}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs md:text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-semibold">{t('dashboard.cohort')}</th>
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
                          {cohort.month1 !== undefined ? (
                            <span className={`inline-block px-2 py-1 rounded font-semibold ${
                              cohort.month1 >= 80 ? 'bg-green-100 text-green-800' :
                              cohort.month1 >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {cohort.month1}%
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="text-center p-2">
                          {cohort.month2 !== undefined ? (
                            <span className={`inline-block px-2 py-1 rounded font-semibold ${
                              cohort.month2 >= 70 ? 'bg-green-100 text-green-800' :
                              cohort.month2 >= 50 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {cohort.month2}%
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="text-center p-2">
                          {cohort.month3 !== undefined ? (
                            <span className={`inline-block px-2 py-1 rounded font-semibold ${
                              cohort.month3 >= 60 ? 'bg-green-100 text-green-800' :
                              cohort.month3 >= 40 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {cohort.month3}%
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="text-center p-2">
                          {cohort.month4 !== undefined ? (
                            <span className={`inline-block px-2 py-1 rounded font-semibold ${
                              cohort.month4 >= 50 ? 'bg-green-100 text-green-800' :
                              cohort.month4 >= 30 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {cohort.month4}%
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="text-center p-2">
                          {cohort.month5 !== undefined ? (
                            <span className={`inline-block px-2 py-1 rounded font-semibold ${
                              cohort.month5 >= 40 ? 'bg-green-100 text-green-800' :
                              cohort.month5 >= 20 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {cohort.month5}%
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
            {/* LTV Over Time */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-base md:text-lg">{t('dashboard.customerLTV')}</CardTitle>
                    <CardDescription className="text-xs md:text-sm">{t('dashboard.avgLTV')}</CardDescription>
                  </div>
                  <Select value={ltvFilter} onValueChange={setLtvFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last6months">{t('dashboard.last6Months')}</SelectItem>
                      <SelectItem value="last12months">{t('dashboard.last12Months')}</SelectItem>
                      <SelectItem value="2025">{t('dashboard.year2025')}</SelectItem>
                      {currentYear > 2025 && <SelectItem value="2026">{t('dashboard.year2026')}</SelectItem>}
                      {currentYear > 2026 && <SelectItem value="2027">{t('dashboard.year2027')}</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={retentionInsights.ltvOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => `฿${Number(value).toLocaleString()}`} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Area type="monotone" dataKey="ltv" stroke="#10b981" fill="#10b98150" name="LTV (฿)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Package Renewal Frequency */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base md:text-lg">{t('dashboard.packageRenewalFrequency')}</CardTitle>
                <CardDescription className="text-xs md:text-sm">{t('dashboard.daysToRenew')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={retentionInsights.purchaseTimeDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} stroke="#6b7280" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#6b7280" />
                    <Tooltip
                      cursor={false}
                      content={({ active, payload, label }: any) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white/80 backdrop-blur-md border-2 border-white/60 rounded-xl shadow-2xl p-4">
                              <p className="font-semibold text-gray-900 mb-2 text-sm">{label}</p>
                              <div className="space-y-1.5">
                                {payload.map((entry: any, index: number) => (
                                  <div key={index} className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.fill }} />
                                    <span className="text-sm text-gray-700">
                                      {entry.name}: <span className="font-semibold text-gray-900">{Number(entry.value).toLocaleString()}</span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#f59e0b"
                      name={t('dashboard.renewedPackages')}
                      radius={[6, 6, 0, 0]}
                      shape={(props: any) => (
                        <rect
                          x={props.x}
                          y={props.y}
                          width={props.width}
                          height={props.height}
                          fill="#f59e0b"
                          rx={6}
                          ry={6}
                        />
                      )}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ========== SECTION 6: PEAK USAGE ANALYTICS ========== */}
      {retentionInsights && (
        <>
          <div className="mt-12 md:mt-16 mb-4 md:mb-6 pt-8 md:pt-12 border-t-2 border-gray-200">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">{t('dashboard.peakUsageAnalytics')}</h2>
            <p className="text-sm md:text-base text-gray-600 mt-1">{t('dashboard.sessionBookingPatterns')}</p>
          </div>

          {/* Peak Usage Heatmap and Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto] gap-6 md:gap-8 mb-6 md:mb-8">
            {/* Peak Usage Heatmap */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base md:text-lg">{t('dashboard.peakUsageHeatmap')}</CardTitle>
                <CardDescription className="text-xs md:text-sm">{t('dashboard.sessionsByDayHour')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="inline-grid gap-1 text-xs" style={{ gridTemplateColumns: 'auto repeat(16, minmax(0, 1fr))' }}>
                    {/* Header row */}
                    <div className="p-2"></div>
                    {Array.from({ length: 16 }, (_, i) => {
                      const hour = i + 7;
                      return (
                        <div key={hour} className="text-center font-semibold text-gray-600 p-2">
                          {hour === 12 ? '12PM' : hour > 12 ? `${hour - 12}PM` : `${hour}AM`}
                        </div>
                      );
                    })}

                    {/* Data rows */}
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <React.Fragment key={day}>
                        <div className="font-semibold text-gray-700 flex items-center justify-end pr-3">
                          {day}
                        </div>
                        {Array.from({ length: 16 }, (_, i) => {
                          const hour = i + 7;
                          const dataPoint = retentionInsights.peakUsage.find(
                            p => p.day === day && p.hour === hour
                          );
                          const sessions = dataPoint?.sessions || 0;
                          const maxSessions = Math.max(...retentionInsights.peakUsage.map(p => p.sessions), 1);
                          const intensity = (sessions / maxSessions) * 100;

                          let bgColor = 'bg-gray-50';
                          let textColor = 'text-gray-400';
                          if (intensity > 75) {
                            bgColor = 'bg-green-600';
                            textColor = 'text-white';
                          } else if (intensity > 50) {
                            bgColor = 'bg-green-500';
                            textColor = 'text-white';
                          } else if (intensity > 25) {
                            bgColor = 'bg-green-300';
                            textColor = 'text-gray-800';
                          } else if (intensity > 10) {
                            bgColor = 'bg-green-100';
                            textColor = 'text-gray-700';
                          }

                          return (
                            <div
                              key={`${day}-${hour}`}
                              className={`${bgColor} h-12 flex items-center justify-center rounded border border-gray-200 cursor-pointer hover:ring-2 hover:ring-primary-400 transition-all`}
                              title={`${day} ${hour}:00 - ${sessions} session${sessions !== 1 ? 's' : ''}`}
                            >
                              {sessions > 0 && (
                                <span className={`text-xs font-semibold ${textColor}`}>
                                  {sessions}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-600">
                    <span>Less</span>
                    <div className="flex gap-1">
                      <div className="w-6 h-6 bg-gray-50 border border-gray-200 rounded"></div>
                      <div className="w-6 h-6 bg-green-100 border border-gray-200 rounded"></div>
                      <div className="w-6 h-6 bg-green-300 border border-gray-200 rounded"></div>
                      <div className="w-6 h-6 bg-green-500 border border-gray-200 rounded"></div>
                      <div className="w-6 h-6 bg-green-600 border border-gray-200 rounded"></div>
                    </div>
                    <span>More</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Sessions Summary Card */}
            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
              <CardContent className="pt-6 flex flex-col items-center justify-center h-full min-w-[200px]">
                <p className="text-xs md:text-sm font-medium text-indigo-700 mb-3">{t('dashboard.totalSessions')}</p>
                <p className="text-4xl md:text-5xl font-bold text-indigo-900 mb-2">
                  {retentionInsights.peakUsage.reduce((sum, p) => sum + p.sessions, 0).toLocaleString()}
                </p>
                <p className="text-xs text-indigo-600 text-center">{t('dashboard.allTimeBookings')}</p>
                <div className="mt-4 pt-4 border-t border-indigo-200 w-full">
                  <div className="text-center">
                    <p className="text-xs text-indigo-600 mb-1">{t('dashboard.peakHour')}</p>
                    <p className="text-base md:text-lg font-semibold text-indigo-900">
                      {(() => {
                        const maxSession = Math.max(...retentionInsights.peakUsage.map(p => p.sessions));
                        const peak = retentionInsights.peakUsage.find(p => p.sessions === maxSession);
                        if (peak) {
                          const hour = peak.hour === 12 ? '12PM' : peak.hour > 12 ? `${peak.hour - 12}PM` : `${peak.hour}AM`;
                          return `${peak.day} ${hour}`;
                        }
                        return 'N/A';
                      })()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
