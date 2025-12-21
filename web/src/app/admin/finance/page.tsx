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

  // Calculate total sessions sold from trends
  const totalSessionsSold = financeData?.packages.byType.reduce(
    (sum, pkg) => sum + (pkg.count * (pkg.name.includes('10') ? 10 : pkg.name.includes('20') ? 20 : 30)),
    0
  ) || 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">{t('finance.title')}</h1>

        {/* Month and Year Selectors */}
        <div className="flex gap-4">
          <Select
            value={selectedMonth}
            onValueChange={(val) => {
              setSelectedMonth(val);
              if (val === 'all') setSelectedYear('all' as any);
            }}
          >
            <SelectTrigger className="w-[180px]">
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
            <SelectTrigger className="w-[120px]">
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

      {!financeData ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">{t('finance.noData')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid md:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-4xl font-bold text-primary-600">
                  {financeData.packages.total}
                </CardTitle>
                <CardDescription>{t('finance.packagesSold')}</CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-4xl font-bold text-blue-600">
                  {totalSessionsSold}
                </CardTitle>
                <CardDescription>{t('finance.sessionsSold')}</CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-4xl font-bold text-green-600">
                  {financeData.sessions.completed}
                </CardTitle>
                <CardDescription>{t('finance.sessionsTaken')}</CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-4xl font-bold text-emerald-600">
                  ฿{financeData.revenue.total.toLocaleString()}
                </CardTitle>
                <CardDescription>{t('finance.totalRevenue')}</CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Graphs Section */}
          <div className="space-y-6">
            {/* Graph Controls */}
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">{t('finance.trendsOverTime')}</h2>
              <div className="flex gap-3">
                {/* Graph Type Toggle */}
                <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setGraphType('revenue')}
                    className={`px-4 py-2 text-sm font-medium transition ${
                      graphType === 'revenue'
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {t('finance.revenue')}
                  </button>
                  <button
                    onClick={() => setGraphType('sessions')}
                    className={`px-4 py-2 text-sm font-medium transition ${
                      graphType === 'sessions'
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {t('finance.sessions')}
                  </button>
                </div>

                {/* Period Filter */}
                <Select value={trendPeriod} onValueChange={setTrendPeriod}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">{t('finance.last6Months')}</SelectItem>
                    <SelectItem value="12">{t('finance.last12Months')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Single Graph with Toggle */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {graphType === 'revenue' ? t('finance.revenueOverTime') : t('finance.sessionsAnalysis')}
                </CardTitle>
                <CardDescription>
                  {graphType === 'revenue'
                    ? t('finance.monthlyRevenueTrends')
                    : t('finance.sessionsSoldVsTaken')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  {graphType === 'revenue' ? (
                    <LineChart data={trendsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="monthYear" />
                      <YAxis />
                      <Tooltip formatter={(value) => `฿${Number(value).toLocaleString()}`} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#10b981"
                        strokeWidth={2}
                        name="Revenue (฿)"
                        dot={(props: any) => {
                          const isSelected = props.payload.monthYear === selectedMonthIdentifier;
                          return (
                            <circle
                              cx={props.cx}
                              cy={props.cy}
                              r={isSelected ? 8 : 4}
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
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="monthYear" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="sessionsSold"
                        name="Sessions Sold"
                        shape={(props: any) => {
                          const isSelected = props.payload.monthYear === selectedMonthIdentifier;
                          return (
                            <rect
                              x={props.x}
                              y={props.y}
                              width={props.width}
                              height={props.height}
                              fill="#3b82f6"
                              stroke={isSelected ? '#f59e0b' : 'none'}
                              strokeWidth={isSelected ? 3 : 0}
                            />
                          );
                        }}
                      />
                      <Bar
                        dataKey="sessionsTaken"
                        name="Sessions Taken"
                        shape={(props: any) => {
                          const isSelected = props.payload.monthYear === selectedMonthIdentifier;
                          return (
                            <rect
                              x={props.x}
                              y={props.y}
                              width={props.width}
                              height={props.height}
                              fill="#10b981"
                              stroke={isSelected ? '#f59e0b' : 'none'}
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
          <Card>
            <CardHeader>
              <CardTitle>{t('finance.packagesSoldPeriod', { period: displayPeriod })}</CardTitle>
              <CardDescription>
                {t('finance.packageDetails', {
                  count: financeData.packages.total,
                  plural: financeData.packages.total !== 1 ? 's' : '',
                  revenue: financeData.revenue.total.toLocaleString()
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {financeData.packages.details.length === 0 ? (
                <p className="text-gray-500">{t('finance.noPackagesSold')}</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {financeData.packages.details.map((pkg) => (
                    <div key={pkg._id} className="border rounded-lg p-4 space-y-3">
                      {/* Package Info */}
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-lg text-primary-600">{pkg.name}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(pkg.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-emerald-600">
                            ฿{pkg.price.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">{pkg.totalSessions} sessions</p>
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="border-t pt-2">
                        <p className="text-xs text-gray-500 mb-1">{t('finance.customer')}</p>
                        <p className="font-medium text-sm">{pkg.customerId.userId.name}</p>
                        <p className="text-xs text-gray-600">{pkg.customerId.userId.email}</p>
                        {pkg.customerId.userId.phone && (
                          <p className="text-xs text-gray-600">{pkg.customerId.userId.phone}</p>
                        )}
                      </div>

                      {/* Teacher Info */}
                      <div className="border-t pt-2">
                        <p className="text-xs text-gray-500 mb-1">{t('finance.primaryTeacher')}</p>
                        {pkg.teacher ? (
                          <p className="font-medium text-sm">{pkg.teacher.userId.name}</p>
                        ) : (
                          <p className="text-xs text-gray-400 italic">{t('finance.noSessionsBooked')}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sessions by Teacher */}
          <Card>
            <CardHeader>
              <CardTitle>{t('finance.sessionsCompletedPeriod', { period: displayPeriod })}</CardTitle>
              <CardDescription>{t('finance.teacherPerformance')}</CardDescription>
            </CardHeader>
            <CardContent>
              {financeData.sessions.byTeacher.length === 0 ? (
                <p className="text-gray-500">{t('finance.noSessionsCompleted')}</p>
              ) : (
                <div className="space-y-4">
                  {financeData.sessions.byTeacher.map((teacher, index) => (
                    <div key={index} className="border rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-lg">{teacher.teacherName}</p>
                        <p className="text-sm text-gray-600">{t('finance.sessionsCompleted')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-blue-600">{teacher.sessionsCount}</p>
                        <p className="text-sm text-gray-500">{t('finance.sessions').toLowerCase()}</p>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-lg">{t('finance.totalSessions')}</p>
                      <p className="text-3xl font-bold text-primary-600">
                        {financeData.sessions.completed}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
