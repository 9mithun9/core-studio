'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { apiClient } from '@/lib/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatStudioTime } from '@/lib/date';

interface CustomerAnalytics {
  totalPackagesPurchased: number;
  totalMoneySpent: number;
  avgDaysBetweenSessions: number;
  avgDaysBetweenPackages: number;
  popularPackages: Array<{
    type: string;
    count: number;
  }>;
}

interface CustomerWithSessions {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  createdAt?: string;
  registrationDate?: string;
  dateOfBirth?: string;
  height?: number;
  weight?: number;
  medicalNotes?: string;
  profilePhoto?: string;
  profession?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  totalCancellations: number;
  sessions: Array<{
    _id: string;
    startTime: string;
    endTime: string;
    status: string;
    type: string;
    teacherId: {
      userId: {
        name: string;
      };
    };
    packageId?: {
      _id: string;
      name: string;
      type: string;
    };
  }>;
  packages: Array<{
    _id: string;
    name: string;
    type: string;
    totalSessions: number;
    remainingSessions: number;
    status: string;
    createdAt: string;
    price?: number;
  }>;
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  analytics?: CustomerAnalytics;
}

export default function AdminCustomersPage() {
  const { t } = useTranslation('admin');
  const [customers, setCustomers] = useState<CustomerWithSessions[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerWithSessions[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithSessions | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sessionFilter, setSessionFilter] = useState<string>('all');
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [heatmapYear, setHeatmapYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data: any = await apiClient.get('/admin/customers-sessions');
      setCustomers(data.customers || []);
      setFilteredCustomers(data.customers || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getDaysSinceLastSession = (customer: CustomerWithSessions): number | null => {
    const now = new Date();
    const completedSessions = customer.sessions
      .filter((s) =>
        s.status === 'completed' ||
        s.status === 'noShow' ||
        (s.status === 'confirmed' && new Date(s.endTime) < now)
      )
      .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());

    if (completedSessions.length === 0) return null;

    const lastSession = completedSessions[0];
    const daysDiff = Math.floor(
      (new Date().getTime() - new Date(lastSession.endTime).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysDiff;
  };

  const hasFinishedAllPackages = (customer: CustomerWithSessions): boolean => {
    return customer.packages.every((pkg) => pkg.status === 'used' || pkg.status === 'expired');
  };

  const getNextUpcomingSession = (customer: CustomerWithSessions) => {
    const upcoming = customer.sessions
      .filter((s) => s.status === 'confirmed' && new Date(s.startTime) > new Date())
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return upcoming[0] || null;
  };

  const getTotalSessionsPurchased = (customer: CustomerWithSessions): number => {
    return customer.packages.reduce((sum, pkg) => sum + pkg.totalSessions, 0);
  };

  const getRemainingSessionsTotal = (customer: CustomerWithSessions): number => {
    const totalPurchased = getTotalSessionsPurchased(customer);
    const completed = customer.completedSessions;
    return totalPurchased - completed;
  };

  const getCompletedSessionsForPackage = (customer: CustomerWithSessions, packageId: string): number => {
    return customer.sessions.filter(
      (s) => s.packageId?._id === packageId &&
             s.status === 'completed'
    ).length;
  };

  const getRemainingSessionsForPackage = (pkg: any, completedCount: number): number => {
    return pkg.totalSessions - completedCount;
  };

  // Filter and search logic
  useEffect(() => {
    let filtered = [...customers];

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((customer) => {
        const name = customer.userId.name?.toLowerCase() || '';
        const email = customer.userId.email?.toLowerCase() || '';
        const phone = customer.userId.phone?.toLowerCase() || '';
        return name.includes(query) || email.includes(query) || phone.includes(query);
      });
    }

    // Apply filter type
    if (filterType === 'finished') {
      filtered = filtered.filter((c) => hasFinishedAllPackages(c));
    } else if (filterType === 'absent') {
      filtered = filtered.filter((c) => {
        const days = getDaysSinceLastSession(c);
        return days !== null && days > 30;
      });
    } else if (filterType === 'recurrent') {
      filtered = filtered.filter((c) => c.packages.length >= 2);
    } else if (filterType === 'new') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      console.log('Today:', new Date().toISOString(), '30 days ago:', thirtyDaysAgo.toISOString());
      filtered = filtered.filter((c) => {
        if (!c.createdAt) {
          console.log('Customer', c.userId.name, 'has no createdAt');
          return false;
        }
        const createdDate = new Date(c.createdAt);
        const isNew = createdDate >= thirtyDaysAgo;
        console.log('Customer:', c.userId.name, 'Created:', createdDate.toISOString(), 'Is New?', isNew);
        return isNew;
      });
    }

    setFilteredCustomers(filtered);
  }, [searchQuery, filterType, customers]);

  if (loading) {
    return <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="text-center text-gray-600">{t('common.loading')}</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-green-50 pb-12">
      <div className="container mx-auto px-4 py-8">
        {/* Gradient Hero Header */}
        <div className="relative bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-8 text-white overflow-hidden mb-8 shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
          <div className="relative z-10">
            <h1 className="text-4xl font-bold mb-2">{t('customers.title')}</h1>
            <p className="text-green-100 text-lg">View and manage customer profiles and analytics</p>
          </div>
        </div>

      {/* Customers List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Left: Customer List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">{t('customers.allCustomers')} ({customers.length})</CardTitle>
            <CardDescription className="text-xs md:text-sm">{t('customers.clickToView')}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search and Filter */}
            <div className="mb-3 md:mb-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder={t('customers.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                />

                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full sm:w-[180px] md:w-[200px] text-xs md:text-sm">
                    <SelectValue placeholder={t('common.filter')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('customers.filterAll')}</SelectItem>
                    <SelectItem value="new">{t('customers.filterNew')}</SelectItem>
                    <SelectItem value="recurrent">{t('customers.filterRecurrent')}</SelectItem>
                    <SelectItem value="finished">{t('customers.filterFinished')}</SelectItem>
                    <SelectItem value="absent">{t('customers.filterAbsent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(searchQuery || filterType !== 'all') && (
                <p className="text-xs md:text-sm text-gray-600">
                  {t('customers.showingOf', { count: filteredCustomers.length, total: customers.length })}
                </p>
              )}
            </div>

            <div className="space-y-2 md:space-y-3 max-h-[400px] md:max-h-[600px] overflow-y-auto">
              {filteredCustomers.length === 0 ? (
                <p className="text-xs md:text-sm text-gray-500 text-center py-6 md:py-8">
                  {searchQuery || filterType !== 'all'
                    ? t('customers.noCustomersFound')
                    : t('customers.noCustomers')}
                </p>
              ) : (
                filteredCustomers.map((customer) => {
                  const daysAbsent = getDaysSinceLastSession(customer);
                  const finished = hasFinishedAllPackages(customer);

                  return (
                    <div
                      key={customer._id}
                      onClick={() => setSelectedCustomer(customer)}
                      className={`border rounded-lg p-3 md:p-4 cursor-pointer transition ${
                        selectedCustomer?._id === customer._id
                          ? 'border-primary-600 bg-primary-50'
                          : 'hover:border-primary-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm md:text-base font-semibold truncate">{customer.userId.name}</p>
                          <p className="text-xs md:text-sm text-gray-600 truncate">{customer.userId.email}</p>
                          {customer.userId.phone && (
                            <p className="text-xs md:text-sm text-gray-500">{customer.userId.phone}</p>
                          )}

                          {/* Status badges */}
                          <div className="flex flex-wrap gap-1.5 md:gap-2 mt-1.5 md:mt-2">
                            {finished && (
                              <span className="text-xs px-1.5 md:px-2 py-0.5 md:py-1 bg-orange-100 text-orange-700 rounded">
                                {t('customers.packagesFinished')}
                              </span>
                            )}
                            {daysAbsent !== null && daysAbsent > 30 && (
                              <span className="text-xs px-1.5 md:px-2 py-0.5 md:py-1 bg-red-100 text-red-700 rounded">
                                {t('customers.absent', { days: daysAbsent })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl md:text-2xl font-bold text-primary-600">
                            {customer.packages.length}
                          </p>
                          <p className="text-xs text-gray-500">{t('customers.packages')}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: Customer Details */}
        <div>
          {selectedCustomer ? (
            <Card>
              {/* Header with Profile Photo and Quick Stats */}
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start gap-4 md:gap-6 mb-3 md:mb-4">
                  <div className="flex-1 w-full">
                    <CardTitle className="text-lg md:text-xl lg:text-2xl mb-1 md:mb-2">{selectedCustomer.userId.name}</CardTitle>
                    <div className="space-y-0.5 md:space-y-1 mt-1 md:mt-2">
                      <p className="text-xs md:text-sm text-muted-foreground break-all">{selectedCustomer.userId.email}</p>
                      {selectedCustomer.userId.phone && (
                        <a
                          href={`https://line.me/ti/p/~${selectedCustomer.userId.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:underline transition-colors text-xs md:text-sm"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                          </svg>
                          {selectedCustomer.userId.phone}
                        </a>
                      )}
                      {selectedCustomer.profession && (
                        <p className="text-xs md:text-sm text-gray-600">{t('customers.profile.profession')} {selectedCustomer.profession}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 mx-auto sm:mx-0">
                    {selectedCustomer.profilePhoto ? (
                      <img
                        src={
                          selectedCustomer.profilePhoto.startsWith('http')
                            ? selectedCustomer.profilePhoto
                            : (() => {
                                const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
                                const baseUrl = apiBaseUrl.replace('/api', '');
                                return `${baseUrl}${selectedCustomer.profilePhoto}`;
                              })()
                        }
                        alt="Profile"
                        className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-2 md:border-4 border-primary-100 shadow-md"
                      />
                    ) : (
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gray-200 flex items-center justify-center text-2xl md:text-3xl font-bold text-gray-500 border-2 md:border-4 border-gray-300">
                        {selectedCustomer.userId.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pt-3 md:pt-4 border-t">
                  <div className="text-center">
                    <p className="text-xl md:text-2xl font-bold text-gray-800">
                      {getTotalSessionsPurchased(selectedCustomer)}
                    </p>
                    <p className="text-xs text-gray-500">{t('customers.totalSessions')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl md:text-2xl font-bold text-green-600">
                      {selectedCustomer.completedSessions}
                    </p>
                    <p className="text-xs text-gray-500">{t('customers.completed')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl md:text-2xl font-bold text-blue-600">
                      {getRemainingSessionsTotal(selectedCustomer)}
                    </p>
                    <p className="text-xs text-gray-500">{t('customers.remaining')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl md:text-2xl font-bold text-red-600">
                      {selectedCustomer.sessions.filter((s: any) => s.status === 'cancelled').length}
                    </p>
                    <p className="text-xs text-gray-500">{t('customers.cancellations')}</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <Tabs defaultValue="session-status" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                    <TabsTrigger value="session-status" className="text-xs md:text-sm">{t('customers.tabs.sessionStatus')}</TabsTrigger>
                    <TabsTrigger value="packages" className="text-xs md:text-sm">{t('customers.tabs.packages')}</TabsTrigger>
                    <TabsTrigger value="profile" className="text-xs md:text-sm">{t('customers.tabs.profile')}</TabsTrigger>
                    <TabsTrigger value="analytics" className="text-xs md:text-sm">{t('customers.tabs.analytics')}</TabsTrigger>
                  </TabsList>

                  {/* Session Status Tab */}
                  <TabsContent value="session-status" className="space-y-4">
                    {(() => {
                      const nextSession = getNextUpcomingSession(selectedCustomer);
                      const finished = hasFinishedAllPackages(selectedCustomer);

                      if (finished) {
                        return (
                          <div className="text-center py-4">
                            <p className="text-orange-600 font-semibold text-lg mb-2">
                              {t('customers.sessionStatus.allPackagesCompleted')}
                            </p>
                            <p className="text-gray-600 text-sm">
                              {t('customers.sessionStatus.finishedMessage')}
                            </p>
                          </div>
                        );
                      }

                      if (nextSession) {
                        const daysUntil = Math.ceil(
                          (new Date(nextSession.startTime).getTime() - new Date().getTime()) /
                            (1000 * 60 * 60 * 24)
                        );
                        return (
                          <div className="border-l-4 border-blue-500 pl-4 py-2">
                            <p className="font-semibold text-lg">{t('customers.sessionStatus.nextSession')}</p>
                            <p className="text-gray-700">
                              {formatStudioTime(nextSession.startTime, 'PPP')}
                            </p>
                            <p className="text-gray-600 text-sm">
                              {formatStudioTime(nextSession.startTime, 'p')} -{' '}
                              {formatStudioTime(nextSession.endTime, 'p')}
                            </p>
                            <p className="text-blue-600 font-medium mt-2">
                              {daysUntil === 0
                                ? t('customers.sessionStatus.today')
                                : daysUntil === 1
                                ? t('customers.sessionStatus.tomorrow')
                                : t('customers.sessionStatus.inDays', { days: daysUntil })}
                            </p>
                            <p className="text-sm text-gray-500">
                              {t('customers.sessionStatus.teacher')} {nextSession.teacherId.userId.name}
                            </p>
                          </div>
                        );
                      }

                      // No upcoming session - check if they have completed any sessions
                      const daysAbsent = getDaysSinceLastSession(selectedCustomer);
                      if (daysAbsent !== null) {
                        const now = new Date();
                        const lastSession = selectedCustomer.sessions
                          .filter((s) =>
                            s.status === 'completed' ||
                            s.status === 'noShow' ||
                            (s.status === 'confirmed' && new Date(s.endTime) < now)
                          )
                          .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())[0];

                        return (
                          <div
                            className={`border-l-4 pl-4 py-2 ${
                              daysAbsent > 30 ? 'border-red-500' : 'border-yellow-500'
                            }`}
                          >
                            <p className="font-semibold text-lg">{t('customers.sessionStatus.noUpcomingSessions')}</p>
                            {finished && (
                              <p className="text-orange-600 font-medium mb-2">{t('customers.sessionStatus.allPackagesCompleted')}</p>
                            )}
                            <p
                              className={`font-medium mt-2 ${
                                daysAbsent > 30 ? 'text-red-600' : 'text-yellow-600'
                              }`}
                            >
                              {t('customers.sessionStatus.lastSession', { days: daysAbsent })}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {formatStudioTime(lastSession.startTime, 'PPP')}
                            </p>
                            <p className="text-sm text-gray-500">
                              {daysAbsent > 30 ? t('customers.sessionStatus.longAbsence') : t('customers.sessionStatus.mayNeedFollowup')}
                            </p>
                          </div>
                        );
                      }

                      // New customer - has packages but no completed sessions
                      if (selectedCustomer.packages.length > 0) {
                        return (
                          <div className="border-l-4 border-blue-500 pl-4 py-2">
                            <p className="font-semibold text-lg text-blue-600">{t('customers.sessionStatus.newCustomer')}</p>
                            <p className="text-gray-600 mt-2">
                              {t('customers.sessionStatus.noSessionsBooked')}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {t('customers.sessionStatus.encourageBooking', { count: selectedCustomer.packages.length })}
                            </p>
                          </div>
                        );
                      }

                      // No packages at all
                      return (
                        <div className="text-center py-4 text-gray-500">
                          <p className="font-semibold">{t('customers.sessionStatus.noPackages')}</p>
                          <p className="text-sm mt-1">{t('customers.sessionStatus.needsToPurchase')}</p>
                        </div>
                      );
                    })()}
                  </TabsContent>

                  {/* Packages & Sessions Tab */}
                  <TabsContent value="packages" className="space-y-4">
                    {/* Packages Section */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">
                        {t('customers.packagesTab.packagesCount', { count: selectedCustomer.packages.length })}
                      </h3>
                      {selectedCustomer.packages.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">{t('customers.packagesTab.noPackages')}</p>
                      ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {selectedCustomer.packages.map((pkg) => {
                            const completedForPackage = getCompletedSessionsForPackage(selectedCustomer, pkg._id);
                            const isSelected = selectedPackageId === pkg._id;

                            return (
                              <div
                                key={pkg._id}
                                onClick={() => setSelectedPackageId(isSelected ? null : pkg._id)}
                                className={`border rounded-lg p-3 cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">{pkg.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span
                                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                          pkg.type === 'private'
                                            ? 'bg-blue-100 text-blue-800'
                                            : pkg.type === 'duo'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-purple-100 text-purple-800'
                                        }`}
                                      >
                                        {pkg.type.charAt(0).toUpperCase() + pkg.type.slice(1)}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">
                                      {t('customers.packagesTab.purchased')} {formatStudioTime(pkg.createdAt, 'PPP')}
                                    </p>
                                    {pkg.price && (
                                      <p className="text-sm text-gray-600 font-medium mt-1">
                                        {t('common.price')}: {pkg.price.toLocaleString()} Baht
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-bold">
                                      {completedForPackage}/{pkg.totalSessions}
                                    </p>
                                    <p className="text-xs text-gray-500">{t('customers.packagesTab.completedOf')}</p>
                                    <span
                                      className={`inline-block mt-1 px-2 py-1 rounded text-xs ${
                                        pkg.status === 'active'
                                          ? 'bg-green-100 text-green-800'
                                          : pkg.status === 'used'
                                          ? 'bg-gray-100 text-gray-800'
                                          : pkg.status === 'expired'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-gray-100 text-gray-800'
                                      }`}
                                    >
                                      {t(`customers.packagesTab.${pkg.status}`)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Sessions Section */}
                    <div className="border-t pt-4">
                      {(() => {
                        // Filter sessions by selected package and status filter
                        const filteredSessions = selectedCustomer.sessions.filter((session) => {
                          const isUpcoming = new Date(session.startTime) > new Date();

                          // Filter by package if one is selected
                          if (selectedPackageId && session.packageId?._id !== selectedPackageId) {
                            return false;
                          }

                          // Filter by status
                          if (sessionFilter === 'all') return true;
                          if (sessionFilter === 'completed') return session.status === 'completed';
                          if (sessionFilter === 'cancelled') return session.status === 'cancelled';
                          if (sessionFilter === 'upcoming') return session.status === 'confirmed' && isUpcoming;
                          if (sessionFilter === 'others') {
                            return session.status !== 'completed' &&
                                   session.status !== 'cancelled' &&
                                   !(session.status === 'confirmed' && isUpcoming);
                          }
                          return true;
                        });

                        return (
                          <>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-sm font-medium text-gray-700">
                                {selectedPackageId
                                  ? t('customers.packagesTab.sessionsForPackage', { count: filteredSessions.length })
                                  : t('customers.packagesTab.allSessions', { count: filteredSessions.length })
                                }
                              </h3>
                              <Select value={sessionFilter} onValueChange={setSessionFilter}>
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder={t('customers.packagesTab.filterSessions')} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">{t('customers.packagesTab.filterAll')}</SelectItem>
                                  <SelectItem value="completed">{t('customers.packagesTab.filterCompleted')}</SelectItem>
                                  <SelectItem value="cancelled">{t('customers.packagesTab.filterCancelled')}</SelectItem>
                                  <SelectItem value="upcoming">{t('customers.packagesTab.filterUpcoming')}</SelectItem>
                                  <SelectItem value="others">{t('customers.packagesTab.filterOthers')}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {selectedCustomer.sessions.length === 0 ? (
                              <p className="text-gray-500 text-center py-8">{t('customers.packagesTab.noSessions')}</p>
                            ) : filteredSessions.length === 0 ? (
                              <p className="text-gray-500 text-center py-4">
                                {selectedPackageId
                                  ? t('customers.packagesTab.noSessionsForPackage')
                                  : t('customers.packagesTab.noSessionsFiltered', { filter: sessionFilter === 'all' ? '' : t(`customers.packagesTab.${sessionFilter}`) })
                                }
                              </p>
                            ) : (
                              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                {filteredSessions.map((session) => {
                                  const isUpcoming = new Date(session.startTime) > new Date();
                                  const isPast = new Date(session.endTime) < new Date();

                                  // Determine display status and style
                                  let displayStatus = session.status;
                                  let statusClass = 'bg-gray-100 text-gray-800';

                                  if (session.status === 'completed') {
                                    displayStatus = t('customers.completed');
                                    statusClass = 'bg-green-100 text-green-800';
                                  } else if (session.status === 'cancelled') {
                                    displayStatus = t('customers.packagesTab.cancelled');
                                    statusClass = 'bg-red-100 text-red-800';
                                  } else if (session.status === 'confirmed') {
                                    if (isUpcoming) {
                                      displayStatus = t('customers.packagesTab.upcoming');
                                      statusClass = 'bg-blue-100 text-blue-800';
                                    } else if (isPast) {
                                      displayStatus = t('customers.packagesTab.pending');
                                      statusClass = 'bg-yellow-100 text-yellow-800';
                                    } else {
                                      displayStatus = t('customers.packagesTab.pending');
                                      statusClass = 'bg-yellow-100 text-yellow-800';
                                    }
                                  } else if (session.status === 'pending') {
                                    displayStatus = t('customers.packagesTab.pending');
                                    statusClass = 'bg-yellow-100 text-yellow-800';
                                  }

                                  return (
                                    <div
                                      key={session._id}
                                      className={`border rounded-lg p-3 ${
                                        isUpcoming ? 'bg-blue-50 border-blue-200' : ''
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="font-medium">
                                            {formatStudioTime(session.startTime, 'PPP')}
                                          </p>
                                          <p className="text-sm text-gray-600">
                                            {formatStudioTime(session.startTime, 'p')} -{' '}
                                            {formatStudioTime(session.endTime, 'p')}
                                          </p>
                                          <p className="text-sm text-gray-600">
                                            {t('customers.sessionStatus.teacher')} {session.teacherId.userId.name}
                                          </p>
                                          <p className="text-sm text-gray-500">{t('common.type')}: {session.type}</p>
                                          {session.packageId && (
                                            <p className="text-sm text-gray-500">
                                              {t('customers.packagesTab.package')} {session.packageId.name}
                                            </p>
                                          )}
                                        </div>
                                        <span className={`px-3 py-1 rounded text-xs font-medium ${statusClass}`}>
                                          {displayStatus}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </TabsContent>

                  {/* Profile Info Tab */}
                  <TabsContent value="profile" className="space-y-4">
                    <div className="space-y-3">
                      {selectedCustomer.dateOfBirth && (
                        <div>
                          <p className="text-sm font-medium text-gray-600">{t('customers.profile.dateOfBirth')}</p>
                          <p className="text-sm">{formatStudioTime(selectedCustomer.dateOfBirth, 'PPP')}</p>
                        </div>
                      )}
                      {selectedCustomer.height && (
                        <div>
                          <p className="text-sm font-medium text-gray-600">{t('customers.profile.height')}</p>
                          <p className="text-sm">{selectedCustomer.height} {t('customers.profile.cm')}</p>
                        </div>
                      )}
                      {selectedCustomer.weight && (
                        <div>
                          <p className="text-sm font-medium text-gray-600">{t('customers.profile.weight')}</p>
                          <p className="text-sm">{selectedCustomer.weight} {t('customers.profile.kg')}</p>
                        </div>
                      )}
                      {selectedCustomer.medicalNotes && (
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-1">{t('customers.profile.medicalNotes')}</p>
                          <p className="text-sm text-gray-700 p-3 bg-yellow-50 border border-yellow-200 rounded">
                            {selectedCustomer.medicalNotes}
                          </p>
                        </div>
                      )}
                      {(selectedCustomer.emergencyContactName || selectedCustomer.emergencyContactPhone) && (
                        <div className="pt-3 border-t">
                          <p className="text-sm font-medium text-gray-600 mb-2">{t('customers.profile.emergencyContact')}</p>
                          {selectedCustomer.emergencyContactName && (
                            <div className="mb-1">
                              <p className="text-xs text-gray-500">{t('common.name')}</p>
                              <p className="text-sm">{selectedCustomer.emergencyContactName}</p>
                            </div>
                          )}
                          {selectedCustomer.emergencyContactPhone && (
                            <div>
                              <p className="text-xs text-gray-500">{t('common.phone')}</p>
                              <a
                                href={`https://line.me/ti/p/~${selectedCustomer.emergencyContactPhone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:underline transition-colors text-sm"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                                </svg>
                                {selectedCustomer.emergencyContactPhone}
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                      {!selectedCustomer.dateOfBirth &&
                       !selectedCustomer.height &&
                       !selectedCustomer.weight &&
                       !selectedCustomer.medicalNotes &&
                       !selectedCustomer.emergencyContactName &&
                       !selectedCustomer.emergencyContactPhone && (
                        <p className="text-gray-500 text-center py-8">{t('customers.profile.noProfileInfo')}</p>
                      )}
                    </div>
                  </TabsContent>

                  {/* Analytics Tab */}
                  <TabsContent value="analytics" className="space-y-4">
                    {!selectedCustomer.analytics ? (
                      <p className="text-gray-500 text-center py-8">{t('customers.analytics.noData')}</p>
                    ) : (
                      <div className="space-y-6">
                        {/* Spending Metrics */}
                        <div>
                          <h3 className="text-lg font-semibold mb-3">{t('customers.analytics.spendingMetrics')}</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="border rounded-lg p-4 text-center">
                              <p className="text-3xl font-bold text-primary-600">
                                {selectedCustomer.analytics.totalPackagesPurchased}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">{t('customers.analytics.packagesPurchased')}</p>
                            </div>
                            <div className="border rounded-lg p-4 text-center">
                              <p className="text-3xl font-bold text-green-600">
                                {selectedCustomer.analytics.totalMoneySpent.toLocaleString()}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">{t('customers.analytics.bahtSpent')}</p>
                            </div>
                          </div>
                        </div>

                        {/* Activity Metrics */}
                        <div>
                          <h3 className="text-lg font-semibold mb-3">{t('customers.analytics.activityMetrics')}</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="border rounded-lg p-4 text-center">
                              <p className="text-3xl font-bold text-blue-600">
                                {selectedCustomer.analytics.avgDaysBetweenSessions.toFixed(1)}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">{t('customers.analytics.avgDaysBetweenSessions')}</p>
                            </div>
                            {selectedCustomer.analytics.totalPackagesPurchased > 1 && (
                              <div className="border rounded-lg p-4 text-center">
                                <p className="text-3xl font-bold text-purple-600">
                                  {selectedCustomer.analytics.avgDaysBetweenPackages.toFixed(1)}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">{t('customers.analytics.avgDaysBetweenPackages')}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Popular Package Types */}
                        <div>
                          <h3 className="text-lg font-semibold mb-3">{t('customers.analytics.popularPackageTypes')}</h3>
                          {selectedCustomer.analytics.popularPackages.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">{t('customers.analytics.noPackageData')}</p>
                          ) : (
                            <div className="space-y-2">
                              {selectedCustomer.analytics.popularPackages.map((pkg, idx) => {
                                const maxCount = selectedCustomer.analytics!.popularPackages[0].count;
                                const percentage = (pkg.count / maxCount) * 100;

                                return (
                                  <div key={idx} className="border rounded-lg p-3 flex items-center justify-between">
                                    <span className="text-sm font-medium capitalize">{pkg.type}</span>
                                    <div className="flex items-center gap-2">
                                      <div className="w-32 bg-gray-200 rounded-full h-2">
                                        <div
                                          className="bg-primary-600 h-2 rounded-full"
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                      <span className="text-sm font-bold w-12 text-right">{pkg.count}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Session Activity Heatmap */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold">{t('customers.analytics.sessionActivity')}</h3>
                            {(() => {
                              const completedSessions = selectedCustomer.sessions.filter(s => s.status === 'completed');
                              if (completedSessions.length === 0) return null;

                              // Get available years
                              const years = [...new Set(
                                completedSessions.map(s => new Date(s.startTime).getFullYear())
                              )].sort((a, b) => b - a);

                              if (years.length === 0) return null;

                              return (
                                <Select value={heatmapYear.toString()} onValueChange={(val) => setHeatmapYear(parseInt(val))}>
                                  <SelectTrigger className="w-[120px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {years.map(year => (
                                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              );
                            })()}
                          </div>

                          <div className="border rounded-lg p-4">
                            {(() => {
                              // Get completed sessions and group by date
                              const completedSessions = selectedCustomer.sessions.filter(s => s.status === 'completed');

                              if (completedSessions.length === 0) {
                                return <p className="text-gray-500 text-center py-4">{t('customers.analytics.noSessionActivity')}</p>;
                              }

                              // Create a map of dates to session counts
                              const sessionsByDate: Record<string, number> = {};
                              completedSessions.forEach(session => {
                                const date = new Date(session.startTime).toISOString().split('T')[0];
                                sessionsByDate[date] = (sessionsByDate[date] || 0) + 1;
                              });

                              // Generate weeks for the selected year
                              const weeks: Date[][] = [];
                              const startDate = new Date(heatmapYear, 0, 1); // Jan 1
                              const endDate = new Date(heatmapYear, 11, 31); // Dec 31
                              const today = new Date();
                              const actualEndDate = endDate > today ? today : endDate;

                              let currentDate = new Date(startDate);
                              // Start from Sunday of the week containing Jan 1
                              currentDate.setDate(currentDate.getDate() - currentDate.getDay());

                              while (currentDate <= actualEndDate) {
                                const week: Date[] = [];
                                for (let i = 0; i < 7; i++) {
                                  week.push(new Date(currentDate));
                                  currentDate.setDate(currentDate.getDate() + 1);
                                }
                                weeks.push(week);
                              }

                              // Find max sessions per day for intensity calculation
                              const maxSessionsPerDay = Math.max(...Object.values(sessionsByDate), 1);

                              // Get intensity color based on session count
                              const getIntensityColor = (count: number) => {
                                if (count === 0) return 'bg-gray-100';
                                const intensity = count / maxSessionsPerDay;
                                if (intensity >= 0.75) return 'bg-green-600';
                                if (intensity >= 0.5) return 'bg-green-500';
                                if (intensity >= 0.25) return 'bg-green-400';
                                return 'bg-green-300';
                              };

                              const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                              const dayLabels = ['Mon', 'Wed', 'Fri'];

                              return (
                                <div className="overflow-x-auto">
                                  <div className="inline-block min-w-full">
                                    {/* Month labels */}
                                    <div className="relative h-4 mb-2 ml-8">
                                      {weeks.map((week, weekIdx) => {
                                        const firstDayOfWeek = week[0];
                                        const month = firstDayOfWeek.getMonth();
                                        const isFirstWeekOfMonth = firstDayOfWeek.getDate() <= 7;

                                        if (!isFirstWeekOfMonth) return null;

                                        return (
                                          <span
                                            key={weekIdx}
                                            className="absolute text-xs text-gray-600 font-medium"
                                            style={{ left: `${weekIdx * 16}px` }}
                                          >
                                            {monthLabels[month]}
                                          </span>
                                        );
                                      })}
                                    </div>

                                    {/* Heatmap grid */}
                                    <div className="flex">
                                      {/* Day labels */}
                                      <div className="flex flex-col justify-around mr-2 text-xs text-gray-600" style={{ width: '28px' }}>
                                        {dayLabels.map((day, idx) => (
                                          <div key={idx} className="h-3 flex items-center">{day}</div>
                                        ))}
                                      </div>

                                      {/* Weeks */}
                                      <div className="flex gap-1">
                                        {weeks.map((week, weekIdx) => (
                                          <div key={weekIdx} className="flex flex-col gap-1">
                                            {week.map((date, dayIdx) => {
                                              const dateStr = date.toISOString().split('T')[0];
                                              const count = sessionsByDate[dateStr] || 0;
                                              const isToday = dateStr === today.toISOString().split('T')[0];
                                              const isFuture = date > today;
                                              const isOutsideYear = date.getFullYear() !== heatmapYear;

                                              return (
                                                <div
                                                  key={dayIdx}
                                                  className={`w-3 h-3 rounded-sm ${
                                                    isFuture || isOutsideYear ? 'bg-transparent' : getIntensityColor(count)
                                                  } ${isToday ? 'ring-2 ring-blue-500' : ''} hover:ring-2 hover:ring-gray-400 cursor-pointer transition-all`}
                                                  title={`${dateStr}: ${count} session${count !== 1 ? 's' : ''}`}
                                                />
                                              );
                                            })}
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Summary */}
                                    <div className="mt-4 text-xs text-gray-600 text-center">
                                      {t('customers.analytics.daysWithSessions', {
                                        count: Object.keys(sessionsByDate).filter(d => new Date(d).getFullYear() === heatmapYear).length,
                                        year: heatmapYear
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">{t('customers.hoverToView')}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
