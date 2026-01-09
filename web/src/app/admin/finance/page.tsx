'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { apiClient } from '@/lib/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MonthlyFinance {
  month: string | number;
  year: string | number;
  isAllTime?: boolean;
  packages: {
    total: number;
    totalSessionsSold: number;
    byType: Array<{
      name: string;
      count: number;
      revenue: number;
    }>;
    details: Array<{
      _id: string;
      name: string;
      price: number;
      totalSessions: number;
      createdAt: string;
      customerId: {
        _id: string;
        userId: {
          name: string;
          email: string;
          phone: string;
        };
      };
      teacher: {
        _id: string;
        userId: {
          name: string;
        };
      } | null;
    }>;
  };
  sessions: {
    total: number;
    completed: number;
    byTeacher: Array<{
      teacherName: string;
      teacherImage?: string;
      sessionsCount: number;
    }>;
  };
  revenue: {
    total: number;
    byPackageType: Array<{
      packageName: string;
      count: number;
      revenue: number;
    }>;
  };
}

interface TrendData {
  monthYear: string;
  packagesSold: number;
  sessionsSold: number;
  sessionsTaken: number;
  revenue: number;
}

export default function AdminFinancePage() {
  const { t } = useTranslation('admin');
  const [financeData, setFinanceData] = useState<MonthlyFinance | null>(null);
  const [trendsData, setTrendsData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [trendPeriod, setTrendPeriod] = useState<string>('6');
  const [graphType, setGraphType] = useState<'revenue' | 'sessions'>('revenue');

  // Generate month options
  const months = [
    { value: '1', label: t('finance.months.january') },
    { value: '2', label: t('finance.months.february') },
    { value: '3', label: t('finance.months.march') },
    { value: '4', label: t('finance.months.april') },
    { value: '5', label: t('finance.months.may') },
    { value: '6', label: t('finance.months.june') },
    { value: '7', label: t('finance.months.july') },
    { value: '8', label: t('finance.months.august') },
    { value: '9', label: t('finance.months.september') },
    { value: '10', label: t('finance.months.october') },
    { value: '11', label: t('finance.months.november') },
    { value: '12', label: t('finance.months.december') },
  ];

  // Generate year options (current year and previous 2 years)
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];

  useEffect(() => {
    // Set current month as default
    const now = new Date();
    setSelectedMonth((now.getMonth() + 1).toString());
    setSelectedYear(now.getFullYear());
  }, []);

  useEffect(() => {
    if (selectedMonth && selectedYear) {
      fetchFinanceData();
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchTrendsData();
  }, [trendPeriod]);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const params =
        selectedMonth === 'all' || selectedYear.toString() === 'all'
          ? { month: 'all', year: 'all' }
          : { month: selectedMonth, year: selectedYear };

      const data: any = await apiClient.get('/admin/finance', { params });
      setFinanceData(data);
    } catch (error) {
      console.error('Error fetching finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendsData = async () => {
    try {
      const data: any = await apiClient.get('/admin/finance-trends', {
        params: { months: trendPeriod },
      });
      setTrendsData(data.trends || []);
    } catch (error) {
      console.error('Error fetching trends data:', error);
    }
  };

  if (loading && !financeData) {
    return <div className="container mx-auto px-4 py-8">{t('common.loading')}</div>;
  }

  const monthName =
    selectedMonth === 'all'
      ? t('finance.allTime')
      : months.find((m) => m.value === selectedMonth)?.label || '';
  const displayPeriod =
    selectedMonth === 'all' || selectedYear.toString() === 'all'
      ? t('finance.allTime')
      : `${monthName} ${selectedYear}`;

  // Create selected month identifier for highlighting (e.g., "Jan 2025")
  const selectedMonthIdentifier =
    selectedMonth === 'all'
      ? null
      : `${months.find(m => m.value === selectedMonth)?.label.slice(0, 3)} ${selectedYear}`;

  // Get total sessions sold from backend
  const totalSessionsSold = financeData?.packages.totalSessionsSold || 0;

  return (
    <div className="min-h-screen pb-12">
      <div className="container mx-auto px-4 py-8">
        {/* Gradient Hero Header */}
        <div className="relative bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl p-8 text-white overflow-hidden mb-8 shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>

          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">{t('finance.title')}</h1>
              <p className="text-white/90 text-lg">
                {displayPeriod}
              </p>
            </div>

            {/* Month and Year Selectors */}
            <div className="flex gap-4">
              <Select
                value={selectedMonth}
                onValueChange={(val) => {
                  setSelectedMonth(val);
                  if (val === 'all') setSelectedYear('all' as any);
                }}
              >
                <SelectTrigger className="w-[180px] bg-white text-gray-900 border-0">
                  <SelectValue placeholder={t('finance.selectMonth')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('finance.allTime')}</SelectItem>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedYear.toString()}
                onValueChange={(val) => {
                  if (val === 'all') {
                    setSelectedYear('all' as any);
                    setSelectedMonth('all');
                  } else {
                    setSelectedYear(Number(val));
                    if (selectedMonth === 'all') {
                      const now = new Date();
                      setSelectedMonth((now.getMonth() + 1).toString());
                    }
                  }
                }}
                disabled={selectedMonth === 'all'}
              >
                <SelectTrigger className="w-[120px] bg-white text-gray-900 border-0">
                  <SelectValue placeholder={t('finance.selectYear')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('finance.allTime')}</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {!financeData ? (
          <Card className="shadow-lg">
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">{t('finance.noData')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Overview Cards - Executive Style */}
            <div className="grid md:grid-cols-4 gap-6 md:gap-8">
              {/* Packages Sold Card */}
              <div className="relative bg-gradient-to-br from-purple-600 via-purple-700 to-pink-700 rounded-2xl p-6 md:p-8 text-white overflow-hidden shadow-xl transform hover:scale-105 transition-all duration-300">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-400 rounded-full opacity-20 animate-pulse"></div>
                <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-pink-400 rounded-full opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="relative z-10">
                  <p className="text-sm font-medium opacity-90 mb-3">{t('finance.packagesSold')}</p>
                  <p className="text-3xl md:text-4xl font-bold mb-1">{financeData.packages.total}</p>
                  <p className="text-xs opacity-75">Total Packages</p>
                </div>
              </div>

              {/* Sessions Sold Card */}
              <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-6 md:p-8 text-white overflow-hidden shadow-xl transform hover:scale-105 transition-all duration-300">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-400 rounded-full opacity-20 animate-pulse"></div>
                <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-indigo-400 rounded-full opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="relative z-10">
                  <p className="text-sm font-medium opacity-90 mb-3">{t('finance.sessionsSold')}</p>
                  <p className="text-3xl md:text-4xl font-bold mb-1">{totalSessionsSold}</p>
                  <p className="text-xs opacity-75">Total Sessions</p>
                </div>
              </div>

              {/* Sessions Taken Card */}
              <div className="relative bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-700 rounded-2xl p-6 md:p-8 text-white overflow-hidden shadow-xl transform hover:scale-105 transition-all duration-300">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-teal-400 rounded-full opacity-20 animate-pulse"></div>
                <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-cyan-400 rounded-full opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="relative z-10">
                  <p className="text-sm font-medium opacity-90 mb-3">{t('finance.sessionsTaken')}</p>
                  <p className="text-3xl md:text-4xl font-bold mb-1">{financeData.sessions.completed}</p>
                  <p className="text-xs opacity-75">{t('finance.completed')}</p>
                </div>
              </div>

              {/* Total Revenue Card */}
              <div className="relative bg-gradient-to-br from-green-600 via-green-700 to-emerald-700 rounded-2xl p-6 md:p-8 text-white overflow-hidden shadow-xl transform hover:scale-105 transition-all duration-300">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-400 rounded-full opacity-20 animate-pulse"></div>
                <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-400 rounded-full opacity-10 animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="relative z-10">
                  <p className="text-sm font-medium opacity-90 mb-3">{t('finance.totalRevenue')}</p>
                  <p className="text-3xl md:text-4xl font-bold mb-1">฿{financeData.revenue.total.toLocaleString()}</p>
                  <p className="text-xs opacity-75">{t('finance.allTime')}</p>
                </div>
              </div>
            </div>

            {/* Custom Tooltip Component */}
            {(() => {
              const CustomTooltip = ({ active, payload, label }: any) => {
                if (active && payload && payload.length) {
                  // Calculate growth if we have trend data
                  const currentIndex = trendsData.findIndex(d => d.monthYear === label);
                  const previousData = currentIndex > 0 ? trendsData[currentIndex - 1] : null;
                  const currentRevenue = payload[0]?.value || 0;
                  const previousRevenue = previousData?.revenue || 0;
                  const growth = previousRevenue > 0
                    ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
                    : null;

                  return (
                    <div className="bg-white/80 backdrop-blur-md border-2 border-white/60 rounded-xl shadow-2xl p-4">
                      <p className="font-semibold text-gray-900 mb-2 text-sm">{label}</p>
                      <div className="space-y-1.5">
                        {payload.map((entry: any, index: number) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-sm text-gray-700">
                              {entry.name}: <span className="font-semibold text-gray-900">
                                {graphType === 'revenue' ? `฿${Number(entry.value).toLocaleString()}` : entry.value}
                              </span>
                            </span>
                          </div>
                        ))}
                        {growth !== null && graphType === 'revenue' && (
                          <div className={`mt-2 pt-2 border-t border-gray-200 text-xs font-semibold ${parseFloat(growth) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {parseFloat(growth) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(growth))}% vs last month
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              };

              return null;
            })()}

            {/* Graphs Section */}
            <div className="space-y-6">
              {/* Single Graph with Toggle */}
              <Card className="bg-white/60 backdrop-blur-sm border-white/40 shadow-xl rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500/90 to-pink-500/90 backdrop-blur-sm px-8 py-6 border-b border-white/20">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-bold text-white">
                        {graphType === 'revenue' ? t('finance.revenueOverTime') : t('finance.sessionsAnalysis')}
                      </h3>
                      <p className="text-sm text-white/90 mt-1">
                        {graphType === 'revenue'
                          ? t('finance.monthlyRevenueTrends')
                          : t('finance.sessionsSoldVsTaken')}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      {/* Graph Type Toggle */}
                      <div className="flex bg-white/90 backdrop-blur-sm border-2 border-white/60 rounded-xl overflow-hidden shadow-sm">
                        <button
                          onClick={() => setGraphType('revenue')}
                          className={`px-4 py-2 text-xs md:text-sm font-semibold transition-all duration-200 ${
                            graphType === 'revenue'
                              ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md'
                              : 'bg-white/50 text-gray-700 hover:bg-white/80'
                          }`}
                        >
                          {t('finance.revenue')}
                        </button>
                        <button
                          onClick={() => setGraphType('sessions')}
                          className={`px-4 py-2 text-xs md:text-sm font-semibold transition-all duration-200 ${
                            graphType === 'sessions'
                              ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md'
                              : 'bg-white/50 text-gray-700 hover:bg-white/80'
                          }`}
                        >
                          {t('finance.sessions')}
                        </button>
                      </div>

                      {/* Period Filter */}
                      <Select value={trendPeriod} onValueChange={setTrendPeriod}>
                        <SelectTrigger className="w-[140px] md:w-[180px] border-2 border-white/60 bg-white/90 backdrop-blur-sm text-xs md:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="6">{t('finance.last6Months')}</SelectItem>
                          <SelectItem value="12">{t('finance.last12Months')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <CardContent className="p-8">
                  <ResponsiveContainer width="100%" height={350}>
                    {graphType === 'revenue' ? (
                      <LineChart data={trendsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="monthYear" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip
                          content={({ active, payload, label }: any) => {
                            if (active && payload && payload.length) {
                              const currentIndex = trendsData.findIndex(d => d.monthYear === label);
                              const previousData = currentIndex > 0 ? trendsData[currentIndex - 1] : null;
                              const currentRevenue = payload[0]?.value || 0;
                              const previousRevenue = previousData?.revenue || 0;
                              const growth = previousRevenue > 0
                                ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
                                : null;

                              return (
                                <div className="bg-white/80 backdrop-blur-md border-2 border-white/60 rounded-xl shadow-2xl p-4">
                                  <p className="font-semibold text-gray-900 mb-2 text-sm">{label}</p>
                                  <div className="space-y-1.5">
                                    {payload.map((entry: any, index: number) => (
                                      <div key={index} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                        <span className="text-sm text-gray-700">
                                          {entry.name}: <span className="font-semibold text-gray-900">฿{Number(entry.value).toLocaleString()}</span>
                                        </span>
                                      </div>
                                    ))}
                                    {growth !== null && (
                                      <div className={`mt-2 pt-2 border-t border-gray-200 text-xs font-semibold ${parseFloat(growth) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {parseFloat(growth) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(growth))}% vs last month
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#10b981"
                          strokeWidth={3}
                          name="Revenue (฿)"
                          dot={(props: any) => {
                            const isSelected = props.payload.monthYear === selectedMonthIdentifier;
                            return (
                              <circle
                                cx={props.cx}
                                cy={props.cy}
                                r={isSelected ? 8 : 5}
                                fill={isSelected ? '#f59e0b' : '#10b981'}
                                stroke={isSelected ? '#d97706' : '#10b981'}
                                strokeWidth={isSelected ? 3 : 2}
                              />
                            );
                          }}
                        />
                      </LineChart>
                    ) : (
                      <BarChart data={trendsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="monthYear" stroke="#6b7280" />
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
                          dataKey="sessionsSold"
                          name="Sessions Sold"
                          fill="#f59e0b"
                          radius={[6, 6, 0, 0]}
                          shape={(props: any) => {
                            const isSelected = props.payload.monthYear === selectedMonthIdentifier;
                            return (
                              <rect
                                x={props.x}
                                y={props.y}
                                width={props.width}
                                height={props.height}
                                fill="#f59e0b"
                                rx={6}
                                ry={6}
                                stroke={isSelected ? '#dc2626' : 'none'}
                                strokeWidth={isSelected ? 3 : 0}
                              />
                            );
                          }}
                        />
                        <Bar
                          dataKey="sessionsTaken"
                          name="Sessions Taken"
                          fill="#8b5cf6"
                          radius={[6, 6, 0, 0]}
                          shape={(props: any) => {
                            const isSelected = props.payload.monthYear === selectedMonthIdentifier;
                            return (
                              <rect
                                x={props.x}
                                y={props.y}
                                width={props.width}
                                height={props.height}
                                fill="#8b5cf6"
                                rx={6}
                                ry={6}
                                stroke={isSelected ? '#dc2626' : 'none'}
                                strokeWidth={isSelected ? 3 : 0}
                              />
                            );
                          }}
                        />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Packages Sold - Individual Cards */}
            <Card className="bg-white/60 backdrop-blur-sm border-white/40 shadow-xl rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500/90 to-pink-500/90 backdrop-blur-sm px-8 py-6 border-b border-white/20">
                <h3 className="text-2xl font-bold text-white">
                  {t('finance.packagesSoldPeriod', { period: displayPeriod })}
                </h3>
                <p className="text-sm text-white/90 mt-1">
                  {t('finance.packageDetails', {
                    count: financeData.packages.total,
                    plural: financeData.packages.total !== 1 ? 's' : '',
                    revenue: financeData.revenue.total.toLocaleString()
                  })}
                </p>
              </div>
              <div className="p-8 overflow-x-auto">
                {financeData.packages.details.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">{t('finance.noPackagesSold')}</p>
                ) : (
                  <div className="flex gap-6 pb-4" style={{ minWidth: 'max-content' }}>
                    {financeData.packages.details.map((pkg) => (
                      <div key={pkg._id} className="bg-white/60 backdrop-blur-sm border-2 border-white/40 rounded-2xl p-6 space-y-4 hover:shadow-2xl transition-all duration-300 hover:scale-105 flex-shrink-0" style={{ width: '380px' }}>
                        {/* Package Info */}
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-bold text-xl text-orange-600">{pkg.name}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              {new Date(pkg.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                          <div className="text-right bg-gradient-to-br from-orange-500/10 to-pink-500/10 rounded-xl px-4 py-2">
                            <p className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
                              ฿{pkg.price.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-600 font-medium mt-1">{pkg.totalSessions} sessions</p>
                          </div>
                        </div>

                        {/* Customer Info */}
                        <div className="bg-white/40 backdrop-blur-sm rounded-xl p-3 border border-orange-200/50">
                          <p className="text-xs text-orange-600 font-semibold mb-2">{t('finance.customer')}</p>
                          <p className="font-bold text-sm text-gray-900">{pkg.customerId.userId.name}</p>
                          <p className="text-xs text-gray-600 mt-1">{pkg.customerId.userId.email}</p>
                          {pkg.customerId.userId.phone && (
                            <p className="text-xs text-gray-600 mt-0.5">{pkg.customerId.userId.phone}</p>
                          )}
                        </div>

                        {/* Teacher Info */}
                        <div className="bg-white/40 backdrop-blur-sm rounded-xl p-3 border border-orange-200/50">
                          <p className="text-xs text-orange-600 font-semibold mb-2">{t('finance.primaryTeacher')}</p>
                          {pkg.teacher ? (
                            <p className="font-bold text-sm text-gray-900">{pkg.teacher.userId.name}</p>
                          ) : (
                            <p className="text-xs text-gray-400 italic">{t('finance.noSessionsBooked')}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Sessions by Teacher */}
            <Card className="bg-white/60 backdrop-blur-sm border-white/40 shadow-xl rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500/90 to-pink-500/90 backdrop-blur-sm px-8 py-6 border-b border-white/20">
                <h3 className="text-2xl font-bold text-white">
                  {t('finance.sessionsCompletedPeriod', { period: displayPeriod })}
                </h3>
                <p className="text-sm text-white/90 mt-1">{t('finance.teacherPerformance')}</p>
              </div>
              <div className="p-8">
                {financeData.sessions.byTeacher.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">{t('finance.noSessionsCompleted')}</p>
                ) : (
                  <div>
                    {/* Vertical Bar Chart */}
                    <div className="relative">
                      <div className="flex items-end justify-center gap-8 mb-8" style={{ height: '400px' }}>
                        {financeData.sessions.byTeacher.map((teacher, index) => {
                          const maxSessions = Math.max(...financeData.sessions.byTeacher.map(t => t.sessionsCount));
                          const barHeight = (teacher.sessionsCount / maxSessions) * 280; // Max height 280px
                          const colors = [
                            { gradient: 'from-blue-500 to-blue-600', solid: 'bg-blue-500' },
                            { gradient: 'from-purple-500 to-purple-600', solid: 'bg-purple-500' },
                            { gradient: 'from-indigo-500 to-indigo-600', solid: 'bg-indigo-500' },
                            { gradient: 'from-cyan-500 to-cyan-600', solid: 'bg-cyan-500' },
                            { gradient: 'from-teal-500 to-teal-600', solid: 'bg-teal-500' },
                          ];
                          const colorScheme = colors[index % colors.length];

                          // Get initials for avatar fallback
                          const initials = teacher.teacherName
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2);

                          return (
                            <div key={index} className="flex flex-col items-center" style={{ width: '120px' }}>
                              {/* Profile Picture Circle */}
                              <div className="mb-3 relative">
                                {teacher.teacherImage ? (
                                  <img
                                    src={`http://localhost:5000${teacher.teacherImage}`}
                                    alt={teacher.teacherName}
                                    className="w-16 h-16 rounded-full object-cover shadow-lg border-4 border-white ring-2 ring-gray-200"
                                    onError={(e) => {
                                      // Fallback to initials if image fails to load
                                      e.currentTarget.style.display = 'none';
                                      e.currentTarget.parentElement!.querySelector('.fallback-avatar')?.classList.remove('hidden');
                                    }}
                                  />
                                ) : null}
                                <div className={`w-16 h-16 ${colorScheme.solid} rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg border-4 border-white ring-2 ring-gray-200 fallback-avatar ${teacher.teacherImage ? 'hidden' : ''}`}>
                                  {initials}
                                </div>
                                {/* Session Count Badge */}
                                <div className="absolute -bottom-2 -right-2 bg-white rounded-full px-2.5 py-1 shadow-lg border-2 border-gray-100">
                                  <p className="text-sm font-bold text-gray-800">{teacher.sessionsCount}</p>
                                </div>
                              </div>

                              {/* Vertical Bar */}
                              <div className="relative group flex-shrink-0">
                                <div
                                  className={`w-20 bg-gradient-to-t ${colorScheme.gradient} rounded-t-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-x-110 cursor-pointer`}
                                  style={{ height: `${barHeight}px`, minHeight: '40px' }}
                                >
                                  {/* Tooltip on hover */}
                                  <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                    {teacher.sessionsCount} sessions
                                  </div>
                                </div>
                              </div>

                              {/* Teacher Name */}
                              <div className="mt-3 text-center">
                                <p className="font-bold text-sm text-gray-800 line-clamp-2 leading-tight">{teacher.teacherName}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
