'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { apiClient } from '@/lib/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatStudioTime } from '@/lib/date';
import toast, { Toaster } from 'react-hot-toast';

interface TeacherWithDetails {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    createdAt: string;
    status: string;
  };
  bio?: string;
  specialties: string[];
  hourlyRate?: number;
  defaultLocation?: string;
  isActive: boolean;
  imageUrl?: string;
  teacherType: 'freelance' | 'studio';
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  thisWeekSessions: number;
  todaySessions: number;
  totalStudents: number;
  lastSessionDate?: string;
}

interface Student {
  customer: {
    _id: string;
    userId: {
      name: string;
      email: string;
      phone?: string;
    };
  };
  totalBookings: number;
  completedBookings: number;
}

interface Session {
  _id: string;
  startTime: string;
  endTime: string;
  status: string;
  type: string;
  customerId: {
    userId: {
      name: string;
      email: string;
    };
  };
  packageId?: {
    name: string;
    type: string;
  };
}

interface TrendData {
  monthYear: string;
  [teacherName: string]: number | string;
}

interface DeepAnalysis {
  topClients: Array<{
    name: string;
    email: string;
    completedSessions: number;
    totalSessions: number;
  }>;
  avgSessionsPerDay: number;
  avgSessionsPerMonth: number;
  popularPackageTypes: Array<{
    type: string;
    count: number;
  }>;
  popularSessionTypes: Array<{
    type: string;
    count: number;
  }>;
}

// Define color palette for teachers
const TEACHER_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#06b6d4', // cyan
  '#6366f1', // indigo
  '#84cc16', // lime
];

export default function AdminTeachersPage() {
  const { t } = useTranslation('admin');
  const [teachers, setTeachers] = useState<TeacherWithDetails[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<TeacherWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherWithDetails | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [teacherStudents, setTeacherStudents] = useState<Student[]>([]);
  const [teacherSessions, setTeacherSessions] = useState<Session[]>([]);
  const [deepAnalysis, setDeepAnalysis] = useState<DeepAnalysis | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [trendsData, setTrendsData] = useState<TrendData[]>([]);
  const [teacherNames, setTeacherNames] = useState<string[]>([]);
  const [trendPeriod, setTrendPeriod] = useState<string>('6months');
  const [showActiveOnly, setShowActiveOnly] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [sessionFilterMonth, setSessionFilterMonth] = useState<string>('all');
  const [sessionFilterYear, setSessionFilterYear] = useState<number>(new Date().getFullYear());
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    bio: '',
    specialties: '',
    yearsOfExperience: '',
  });

  useEffect(() => {
    fetchTeachers();
    fetchTrendsData();
  }, []);

  useEffect(() => {
    fetchTrendsData();
  }, [trendPeriod, showActiveOnly]);

  useEffect(() => {
    let filtered = [...teachers];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((teacher) => {
        const name = teacher.userId.name?.toLowerCase() || '';
        const email = teacher.userId.email?.toLowerCase() || '';
        const phone = teacher.userId.phone?.toLowerCase() || '';
        const specialties = teacher.specialties.join(' ').toLowerCase();
        return name.includes(query) || email.includes(query) || phone.includes(query) || specialties.includes(query);
      });
    }

    setFilteredTeachers(filtered);
  }, [searchQuery, teachers]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const data: any = await apiClient.get('/admin/teachers');
      setTeachers(data.teachers || []);
      setFilteredTeachers(data.teachers || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActiveClick = (teacherId: string, currentStatus: boolean) => {
    // If deactivating, show confirmation dialog
    if (currentStatus) {
      setShowDeactivateConfirm(true);
    } else {
      // If activating, proceed directly
      handleToggleActive(teacherId, currentStatus);
    }
  };

  const handleToggleActive = async (teacherId: string, currentStatus: boolean) => {
    setShowDeactivateConfirm(false);

    const loadingToast = toast.loading(
      currentStatus ? t('teachers.deactivating') : t('teachers.activating')
    );

    try {
      const response: any = await apiClient.patch(`/admin/teachers/${teacherId}/toggle-active`);

      let successMessage = currentStatus
        ? t('teachers.deactivatedSuccess')
        : t('teachers.activatedSuccess');

      // If sessions were cancelled, add that info to the message
      if (response.cancelledSessions && response.cancelledSessions > 0) {
        successMessage += ` ${response.cancelledSessions} future session(s) cancelled and customers notified.`;
      }

      toast.success(successMessage, { id: loadingToast });
      fetchTeachers();
    } catch (error: any) {
      toast.error(
        error.response?.data?.error || t('teachers.toggleFailed'),
        { id: loadingToast }
      );
    }
  };

  const handleUpdateTeacherType = async (teacherId: string, newType: 'freelance' | 'studio') => {
    const loadingToast = toast.loading(t('teachers.updatingType'));

    try {
      await apiClient.patch(`/admin/teachers/${teacherId}/type`, {
        teacherType: newType,
      });

      toast.success(t('teachers.typeUpdatedSuccess'), { id: loadingToast });
      fetchTeachers();
      if (selectedTeacher?._id === teacherId) {
        setSelectedTeacher({ ...selectedTeacher, teacherType: newType });
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.error || t('teachers.typeUpdateFailed'),
        { id: loadingToast }
      );
    }
  };

  const handleCreateTeacher = async () => {
    if (!createForm.name || !createForm.email || !createForm.password) {
      toast.error(t('teachers.createModal.fillRequired'));
      return;
    }

    const loadingToast = toast.loading(t('teachers.createModal.creating'));

    try {
      const specialtiesArray = createForm.specialties
        ? createForm.specialties.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      const payload: any = {
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        phone: createForm.phone,
        bio: createForm.bio,
        specialties: specialtiesArray,
      };

      if (createForm.yearsOfExperience) {
        payload.yearsOfExperience = parseInt(createForm.yearsOfExperience);
      }

      await apiClient.post('/admin/teachers', payload);

      toast.success(t('teachers.createModal.success'), { id: loadingToast });
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        email: '',
        password: '',
        phone: '',
        bio: '',
        yearsOfExperience: '',
        specialties: '',
      });
      fetchTeachers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('teachers.createModal.failed'), {
        id: loadingToast,
      });
    }
  };

  const fetchTeacherDetails = async (teacherId: string, month?: string, year?: number) => {
    try {
      setDetailsLoading(true);

      const params: any = {};
      if (month && month !== 'all') {
        params.month = month;
        params.year = year || sessionFilterYear;
      }

      const data: any = await apiClient.get(`/admin/teachers/${teacherId}`, { params });
      setTeacherStudents(data.students || []);
      setTeacherSessions(data.sessions || []);
      setDeepAnalysis(data.deepAnalysis || null);
    } catch (error) {
      console.error('Error fetching teacher details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const fetchTrendsData = async () => {
    try {
      const params: any = {
        activeOnly: showActiveOnly.toString()
      };

      // Check if period is a year (numeric) or a month period (6months/12months)
      if (trendPeriod === '6months') {
        params.months = '6';
      } else if (trendPeriod === '12months') {
        params.months = '12';
      } else {
        // It's a year
        params.year = trendPeriod;
      }

      const data: any = await apiClient.get('/admin/teacher-session-trends', {
        params,
      });
      setTrendsData(data.trends || []);
      setTeacherNames(data.teachers || []);
    } catch (error) {
      console.error('Error fetching teacher trends:', error);
    }
  };

  const handleSelectTeacher = (teacher: TeacherWithDetails) => {
    setSelectedTeacher(teacher);
    // Reset filters when selecting a new teacher
    setSessionFilterMonth('all');
    setSessionFilterYear(new Date().getFullYear());
    fetchTeacherDetails(teacher._id, 'all', new Date().getFullYear());
  };

  const getDaysSinceLastSession = (teacher: TeacherWithDetails): number | null => {
    if (!teacher.lastSessionDate) return null;

    const daysDiff = Math.floor(
      (new Date().getTime() - new Date(teacher.lastSessionDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysDiff;
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="text-center text-gray-600">{t('common.loading')}</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-purple-50 pb-12">
      <div className="container mx-auto px-4 py-8">
        {/* Gradient Hero Header */}
        <div className="relative bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-8 text-white overflow-hidden mb-8 shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">{t('teachers.title')}</h1>
              <p className="text-purple-100 text-lg">Manage your teaching staff and performance</p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              size="lg"
              className="bg-white text-purple-700 hover:bg-gray-100 hidden md:flex"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {t('teachers.createTeacher')}
            </Button>
          </div>
        </div>

        {/* Mobile Create Button */}
        <div className="md:hidden mb-6">
          <Button
            onClick={() => setShowCreateModal(true)}
            size="sm"
            className="w-full"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t('teachers.createTeacher')}
          </Button>
        </div>

      {/* Teacher Sessions Graph */}
      <Card className="mb-4 md:mb-6">
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-base md:text-lg">{t('teachers.sessionsOverTime')}</CardTitle>
                <CardDescription className="text-xs md:text-sm">{t('teachers.completedByMonth')}</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {/* Active/All Teachers Toggle */}
                <Select value={showActiveOnly.toString()} onValueChange={(val) => setShowActiveOnly(val === 'true')}>
                  <SelectTrigger className="w-full sm:w-[160px] text-xs md:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{t('teachers.activeOnly')}</SelectItem>
                    <SelectItem value="false">{t('teachers.allTeachersFilter')}</SelectItem>
                  </SelectContent>
                </Select>

                {/* Combined Year/Period Selector */}
                <Select value={trendPeriod} onValueChange={setTrendPeriod}>
                  <SelectTrigger className="w-full sm:w-[160px] text-xs md:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6months">{t('teachers.last6Months')}</SelectItem>
                    <SelectItem value="12months">{t('teachers.last12Months')}</SelectItem>
                    {(() => {
                      const currentYear = new Date().getFullYear();
                      const years = [];
                      for (let year = currentYear; year >= 2024; year--) {
                        years.push(year);
                      }
                      return years.map(year => (
                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monthYear" />
              <YAxis />
              <Tooltip />
              <Legend />
              {teacherNames.map((teacherName, index) => (
                <Line
                  key={teacherName}
                  type="monotone"
                  dataKey={teacherName}
                  stroke={TEACHER_COLORS[index % TEACHER_COLORS.length]}
                  strokeWidth={2}
                  name={teacherName}
                  dot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Left: Teacher List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">{t('teachers.allTeachers', { count: teachers.length })}</CardTitle>
            <CardDescription className="text-xs md:text-sm">{t('teachers.clickToView')}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-3 md:mb-4">
              <input
                type="text"
                placeholder={t('teachers.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 md:px-4 py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
              />

              {searchQuery && (
                <p className="text-xs md:text-sm text-gray-600 mt-2">
                  {t('teachers.showingOf', { count: filteredTeachers.length, total: teachers.length })}
                </p>
              )}
            </div>

            <div className="space-y-2 md:space-y-3 max-h-[600px] overflow-y-auto">
              {filteredTeachers.length === 0 ? (
                <p className="text-xs md:text-sm text-gray-500 text-center py-6 md:py-8">
                  {searchQuery
                    ? t('teachers.noTeachersFound')
                    : t('teachers.noTeachers')}
                </p>
              ) : (
                filteredTeachers.map((teacher) => {
                  const daysInactive = getDaysSinceLastSession(teacher);

                  return (
                    <div
                      key={teacher._id}
                      onClick={() => handleSelectTeacher(teacher)}
                      className={`border rounded-lg p-3 md:p-4 cursor-pointer transition ${
                        selectedTeacher?._id === teacher._id
                          ? 'border-primary-600 bg-primary-50'
                          : 'hover:border-primary-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm md:text-base font-semibold truncate">{teacher.userId.name}</p>
                            {!teacher.isActive && (
                              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded flex-shrink-0">
                                {t('teachers.inactive')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs md:text-sm text-gray-600 truncate">{teacher.userId.email}</p>
                          {teacher.userId.phone && (
                            <p className="text-xs md:text-sm text-gray-500">{teacher.userId.phone}</p>
                          )}
                          {teacher.specialties.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {teacher.specialties.slice(0, 2).map((specialty, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded"
                                >
                                  {specialty}
                                </span>
                              ))}
                              {teacher.specialties.length > 2 && (
                                <span className="text-xs text-gray-500">
                                  +{teacher.specialties.length - 2} more
                                </span>
                              )}
                            </div>
                          )}

                          {/* Status badges */}
                          <div className="flex gap-2 mt-2">
                            {daysInactive !== null && daysInactive > 30 && (
                              <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">
                                {t('teachers.inactiveDays', { days: daysInactive })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl md:text-2xl font-bold text-primary-600">
                            {teacher.totalStudents}
                          </p>
                          <p className="text-xs text-gray-500">{t('teachers.students')}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: Teacher Details with Tabs */}
        <div>
          {selectedTeacher ? (
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3 md:gap-4">
                      {/* Profile photo */}
                      <div className="flex-shrink-0">
                        {selectedTeacher.imageUrl ? (
                          <img
                            src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${selectedTeacher.imageUrl}`}
                            alt="Profile"
                            className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover border-4 border-primary-100 shadow-md"
                          />
                        ) : (
                          <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-200 flex items-center justify-center text-xl md:text-2xl font-bold text-gray-500 border-4 border-gray-300">
                            {selectedTeacher.userId.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base md:text-lg truncate">{selectedTeacher.userId.name}</CardTitle>
                        <CardDescription className="text-xs md:text-sm truncate">{selectedTeacher.userId.email}</CardDescription>
                      </div>
                    </div>
                    {!selectedTeacher.isActive && (
                      <span className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs md:text-sm font-medium self-start sm:self-center">
                        {t('teachers.inactive')}
                      </span>
                    )}
                  </div>

                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-4 mt-3 md:mt-4">
                  <div className="text-center p-2 md:p-3 bg-gray-50 rounded">
                    <p className="text-xl md:text-2xl font-bold text-gray-800">
                      {selectedTeacher.completedSessions}
                    </p>
                    <p className="text-xs text-gray-500">{t('teachers.stats.completed')}</p>
                  </div>
                  <div className="text-center p-2 md:p-3 bg-blue-50 rounded">
                    <p className="text-xl md:text-2xl font-bold text-blue-600">
                      {selectedTeacher.todaySessions}
                    </p>
                    <p className="text-xs text-gray-500">{t('teachers.stats.today')}</p>
                  </div>
                  <div className="text-center p-2 md:p-3 bg-green-50 rounded">
                    <p className="text-xl md:text-2xl font-bold text-green-600">
                      {selectedTeacher.thisWeekSessions}
                    </p>
                    <p className="text-xs text-gray-500">{t('teachers.stats.thisWeek')}</p>
                  </div>
                  <div className="text-center p-2 md:p-3 bg-purple-50 rounded">
                    <p className="text-xl md:text-2xl font-bold text-purple-600">
                      {selectedTeacher.totalStudents}
                    </p>
                    <p className="text-xs text-gray-500">{t('teachers.stats.students')}</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 text-xs md:text-sm">
                    <TabsTrigger value="overview">{t('teachers.tabs.overview')}</TabsTrigger>
                    <TabsTrigger value="students">{t('teachers.tabs.students')}</TabsTrigger>
                    <TabsTrigger value="sessions">{t('teachers.tabs.sessions')}</TabsTrigger>
                    <TabsTrigger value="analytics">{t('teachers.tabs.analytics')}</TabsTrigger>
                  </TabsList>

                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-3 md:space-y-4">
                    <div className="space-y-2 md:space-y-3">
                      <div>
                        <p className="text-xs md:text-sm font-medium text-gray-600">{t('teachers.overview.email')}</p>
                        <p className="text-xs md:text-sm break-all">{selectedTeacher.userId.email}</p>
                      </div>
                      {selectedTeacher.userId.phone && (
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-600">{t('teachers.overview.phone')}</p>
                          <p className="text-xs md:text-sm">{selectedTeacher.userId.phone}</p>
                        </div>
                      )}
                      {selectedTeacher.hourlyRate && (
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-600">{t('teachers.overview.hourlyRate')}</p>
                          <p className="text-xs md:text-sm">฿{selectedTeacher.hourlyRate}</p>
                        </div>
                      )}
                      {selectedTeacher.defaultLocation && (
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-600">{t('teachers.overview.location')}</p>
                          <p className="text-xs md:text-sm">{selectedTeacher.defaultLocation}</p>
                        </div>
                      )}
                      {selectedTeacher.bio && (
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">{t('teachers.overview.bio')}</p>
                          <p className="text-xs md:text-sm text-gray-700 p-2 md:p-3 bg-gray-50 rounded">{selectedTeacher.bio}</p>
                        </div>
                      )}
                      {selectedTeacher.specialties.length > 0 && (
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-600 mb-2">{t('teachers.overview.specialties')}</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedTeacher.specialties.map((specialty, idx) => (
                              <span
                                key={idx}
                                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded"
                              >
                                {specialty}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Teacher Type Control */}
                      <div className="pt-4 border-t border-gray-200">
                        <p className="text-xs md:text-sm font-medium text-gray-600 mb-3">{t('teachers.teacherType')}</p>
                        <Select
                          value={selectedTeacher.teacherType}
                          onValueChange={(value: 'freelance' | 'studio') => handleUpdateTeacherType(selectedTeacher._id, value)}
                        >
                          <SelectTrigger className="w-full text-xs md:text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="freelance">
                              <div className="flex flex-col items-start">
                                <span className="font-medium">{t('teachers.freelance')}</span>
                                <span className="text-xs text-gray-500">{t('teachers.freelanceDesc')}</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="studio">
                              <div className="flex flex-col items-start">
                                <span className="font-medium">{t('teachers.studio')}</span>
                                <span className="text-xs text-gray-500">{t('teachers.studioDesc')}</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Teacher Status Control */}
                      <div className="pt-4 border-t border-gray-200">
                        <p className="text-xs md:text-sm font-medium text-gray-600 mb-3">Teacher Status</p>
                        <Button
                          onClick={() => handleToggleActiveClick(selectedTeacher._id, selectedTeacher.isActive)}
                          variant={selectedTeacher.isActive ? "outline" : "default"}
                          size="sm"
                          className={`w-full ${
                            selectedTeacher.isActive
                              ? 'border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {selectedTeacher.isActive ? (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                              {t('teachers.deactivate')}
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {t('teachers.activate')}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Students Tab */}
                  <TabsContent value="students">
                    {detailsLoading ? (
                      <p className="text-xs md:text-sm text-gray-500 text-center py-6 md:py-8">{t('teachers.studentsTab.loading')}</p>
                    ) : teacherStudents.length === 0 ? (
                      <p className="text-xs md:text-sm text-gray-500 text-center py-6 md:py-8">{t('teachers.studentsTab.noStudents')}</p>
                    ) : (
                      <div className="space-y-2 md:space-y-3 max-h-[500px] overflow-y-auto">
                        {teacherStudents.map((student) => (
                          <div key={student.customer._id} className="border rounded-lg p-2 md:p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm md:text-base font-medium truncate">{student.customer.userId.name}</p>
                                <p className="text-xs md:text-sm text-gray-600 truncate">{student.customer.userId.email}</p>
                                {student.customer.userId.phone && (
                                  <p className="text-xs md:text-sm text-gray-500">{student.customer.userId.phone}</p>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-base md:text-lg font-bold">
                                  {student.completedBookings}/{student.totalBookings}
                                </p>
                                <p className="text-xs text-gray-500">{t('teachers.studentsTab.completed')}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Sessions Tab */}
                  <TabsContent value="sessions">
                    {/* Month/Year Filter */}
                    <div className="flex gap-2 mb-4 pb-4 border-b border-gray-200">
                      <Select
                        value={sessionFilterMonth}
                        onValueChange={(val) => {
                          setSessionFilterMonth(val);
                          if (selectedTeacher) {
                            fetchTeacherDetails(selectedTeacher._id, val, sessionFilterYear);
                          }
                        }}
                      >
                        <SelectTrigger className="w-[140px] text-xs md:text-sm">
                          <SelectValue placeholder="Select Month" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="1">January</SelectItem>
                          <SelectItem value="2">February</SelectItem>
                          <SelectItem value="3">March</SelectItem>
                          <SelectItem value="4">April</SelectItem>
                          <SelectItem value="5">May</SelectItem>
                          <SelectItem value="6">June</SelectItem>
                          <SelectItem value="7">July</SelectItem>
                          <SelectItem value="8">August</SelectItem>
                          <SelectItem value="9">September</SelectItem>
                          <SelectItem value="10">October</SelectItem>
                          <SelectItem value="11">November</SelectItem>
                          <SelectItem value="12">December</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select
                        value={sessionFilterYear.toString()}
                        onValueChange={(val) => {
                          const year = Number(val);
                          setSessionFilterYear(year);
                          if (selectedTeacher) {
                            fetchTeacherDetails(selectedTeacher._id, sessionFilterMonth, year);
                          }
                        }}
                        disabled={sessionFilterMonth === 'all'}
                      >
                        <SelectTrigger className="w-[100px] text-xs md:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[2024, 2025, 2026].map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {detailsLoading ? (
                      <p className="text-xs md:text-sm text-gray-500 text-center py-6 md:py-8">{t('teachers.sessionsTab.loading')}</p>
                    ) : teacherSessions.length === 0 ? (
                      <p className="text-xs md:text-sm text-gray-500 text-center py-6 md:py-8">{t('teachers.sessionsTab.noSessions')}</p>
                    ) : (
                      <div className="space-y-2 md:space-y-3 max-h-[500px] overflow-y-auto">
                        {teacherSessions.map((session) => {
                          const isUpcoming = new Date(session.startTime) > new Date();
                          let statusClass = 'bg-gray-100 text-gray-800';

                          if (session.status === 'completed') {
                            statusClass = 'bg-green-100 text-green-800';
                          } else if (session.status === 'cancelled') {
                            statusClass = 'bg-red-100 text-red-800';
                          } else if (session.status === 'confirmed' && isUpcoming) {
                            statusClass = 'bg-blue-100 text-blue-800';
                          } else if (session.status === 'pending') {
                            statusClass = 'bg-yellow-100 text-yellow-800';
                          }

                          return (
                            <div
                              key={session._id}
                              className={`border rounded-lg p-2 md:p-3 ${
                                isUpcoming ? 'bg-blue-50 border-blue-200' : ''
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm md:text-base font-medium">
                                    {formatStudioTime(session.startTime, 'PPP')}
                                  </p>
                                  <p className="text-xs md:text-sm text-gray-600">
                                    {formatStudioTime(session.startTime, 'p')} -{' '}
                                    {formatStudioTime(session.endTime, 'p')}
                                  </p>
                                  <p className="text-xs md:text-sm text-gray-600 truncate">
                                    {t('teachers.sessionsTab.student')} {session.customerId.userId.name}
                                  </p>
                                  <p className="text-xs md:text-sm text-gray-500">{t('teachers.sessionsTab.type')} {session.type}</p>
                                  {session.packageId && (
                                    <p className="text-xs md:text-sm text-gray-500">
                                      {t('teachers.sessionsTab.package')} {session.packageId.name}
                                    </p>
                                  )}
                                </div>
                                <span className={`px-2 md:px-3 py-1 rounded text-xs font-medium ${statusClass} self-start sm:self-center flex-shrink-0`}>
                                  {session.status}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>

                  {/* Analytics Tab */}
                  <TabsContent value="analytics">
                    {detailsLoading ? (
                      <p className="text-xs md:text-sm text-gray-500 text-center py-6 md:py-8">{t('teachers.analytics.loading')}</p>
                    ) : !deepAnalysis ? (
                      <p className="text-xs md:text-sm text-gray-500 text-center py-6 md:py-8">{t('teachers.analytics.noData')}</p>
                    ) : (
                      <div className="space-y-4 md:space-y-6">
                        {/* Average Sessions */}
                        <div>
                          <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-3">{t('teachers.analytics.activityMetrics')}</h3>
                          <div className="grid grid-cols-2 gap-3 md:gap-4">
                            <div className="border rounded-lg p-3 md:p-4 text-center">
                              <p className="text-2xl md:text-3xl font-bold text-primary-600">
                                {deepAnalysis.avgSessionsPerDay}
                              </p>
                              <p className="text-xs md:text-sm text-gray-600 mt-1">{t('teachers.analytics.avgSessionsPerDay')}</p>
                            </div>
                            <div className="border rounded-lg p-3 md:p-4 text-center">
                              <p className="text-2xl md:text-3xl font-bold text-blue-600">
                                {deepAnalysis.avgSessionsPerMonth}
                              </p>
                              <p className="text-xs md:text-sm text-gray-600 mt-1">{t('teachers.analytics.avgSessionsPerMonth')}</p>
                            </div>
                          </div>
                        </div>

                        {/* Top Clients */}
                        <div>
                          <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-3">{t('teachers.analytics.topClients')}</h3>
                          {deepAnalysis.topClients.length === 0 ? (
                            <p className="text-xs md:text-sm text-gray-500 text-center py-3 md:py-4">{t('teachers.analytics.noClients')}</p>
                          ) : (
                            <div className="space-y-2">
                              {deepAnalysis.topClients.map((client, idx) => (
                                <div key={idx} className="border rounded-lg p-2 md:p-3 flex items-center justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm md:text-base font-medium truncate">{client.name}</p>
                                    <p className="text-xs md:text-sm text-gray-600 truncate">{client.email}</p>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-lg md:text-xl font-bold text-primary-600">
                                      {client.completedSessions}
                                    </p>
                                    <p className="text-xs text-gray-500">{t('teachers.analytics.sessions')}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Popular Package Types */}
                        <div>
                          <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-3">{t('teachers.analytics.popularPackageTypes')}</h3>
                          {deepAnalysis.popularPackageTypes.length === 0 ? (
                            <p className="text-xs md:text-sm text-gray-500 text-center py-3 md:py-4">{t('teachers.analytics.noPackageData')}</p>
                          ) : (
                            <div className="space-y-2">
                              {deepAnalysis.popularPackageTypes.map((pkg, idx) => (
                                <div key={idx} className="border rounded-lg p-2 md:p-3 flex items-center justify-between gap-2">
                                  <span className="text-xs md:text-sm font-medium capitalize flex-shrink-0">{pkg.type}</span>
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="w-20 md:w-32 bg-gray-200 rounded-full h-2">
                                      <div
                                        className="bg-primary-600 h-2 rounded-full"
                                        style={{
                                          width: `${(pkg.count / deepAnalysis.popularPackageTypes[0].count) * 100}%`,
                                        }}
                                      />
                                    </div>
                                    <span className="text-xs md:text-sm font-bold w-8 md:w-12 text-right flex-shrink-0">{pkg.count}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Popular Session Types */}
                        <div>
                          <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-3">{t('teachers.analytics.popularSessionTypes')}</h3>
                          {deepAnalysis.popularSessionTypes.length === 0 ? (
                            <p className="text-xs md:text-sm text-gray-500 text-center py-3 md:py-4">{t('teachers.analytics.noSessionData')}</p>
                          ) : (
                            <div className="space-y-2">
                              {deepAnalysis.popularSessionTypes.map((sessionType, idx) => (
                                <div key={idx} className="border rounded-lg p-2 md:p-3 flex items-center justify-between gap-2">
                                  <span className="text-xs md:text-sm font-medium capitalize flex-shrink-0">{sessionType.type}</span>
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="w-20 md:w-32 bg-gray-200 rounded-full h-2">
                                      <div
                                        className="bg-blue-600 h-2 rounded-full"
                                        style={{
                                          width: `${(sessionType.count / deepAnalysis.popularSessionTypes[0].count) * 100}%`,
                                        }}
                                      />
                                    </div>
                                    <span className="text-xs md:text-sm font-bold w-8 md:w-12 text-right flex-shrink-0">{sessionType.count}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 md:py-12 text-center">
                <p className="text-xs md:text-sm text-gray-500">{t('teachers.selectToView')}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Teacher Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h2 className="text-lg md:text-xl font-bold">{t('teachers.createModal.title')}</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 md:space-y-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                  {t('teachers.createModal.name')}
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder={t('teachers.createModal.namePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                  {t('teachers.createModal.email')}
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder={t('teachers.createModal.emailPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                  {t('teachers.createModal.password')}
                </label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder={t('teachers.createModal.passwordPlaceholder')}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                    {t('teachers.createModal.phone')}
                  </label>
                  <input
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder={t('teachers.createModal.phonePlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                    {t('teachers.createModal.yearsOfExperience')}
                  </label>
                  <input
                    type="number"
                    value={createForm.yearsOfExperience}
                    onChange={(e) => setCreateForm({ ...createForm, yearsOfExperience: e.target.value })}
                    className="w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder={t('teachers.createModal.experiencePlaceholder')}
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                  {t('teachers.createModal.bio')}
                </label>
                <textarea
                  value={createForm.bio}
                  onChange={(e) => setCreateForm({ ...createForm, bio: e.target.value })}
                  className="w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder={t('teachers.createModal.bioPlaceholder')}
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                  {t('teachers.createModal.specialties')}
                </label>
                <input
                  type="text"
                  value={createForm.specialties}
                  onChange={(e) => setCreateForm({ ...createForm, specialties: e.target.value })}
                  className="w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder={t('teachers.createModal.specialtiesPlaceholder')}
                />
                <p className="text-xs text-gray-500 mt-1">{t('teachers.createModal.specialtiesHelp')}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 md:gap-3 mt-4 md:mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 text-xs md:text-sm"
                >
                  {t('teachers.createModal.cancel')}
                </Button>
                <Button
                  onClick={handleCreateTeacher}
                  className="flex-1 text-xs md:text-sm"
                >
                  {t('teachers.createModal.create')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Dialog */}
      {showDeactivateConfirm && selectedTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Deactivate Teacher?</h2>
              <p className="text-sm text-gray-600 mb-3">
                Are you sure you want to deactivate <span className="font-semibold">{selectedTeacher.userId.name}</span>?
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> All future sessions will be automatically cancelled and customers will be notified.
                </p>
              </div>
              <p className="text-xs text-gray-500">
                This action can be reversed by activating the teacher again.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowDeactivateConfirm(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleToggleActive(selectedTeacher._id, selectedTeacher.isActive)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                Yes, Deactivate
              </Button>
            </div>
          </div>
        </div>
      )}

      <Toaster position="top-right" />
      </div>
    </div>
  );
}
