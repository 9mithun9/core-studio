'use client';

import { useEffect, useState } from 'react';
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
  const [trendPeriod, setTrendPeriod] = useState<string>('6');
  const [showCreateModal, setShowCreateModal] = useState(false);
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
  }, [trendPeriod]);

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
      const data = await apiClient.get('/admin/teachers');
      setTeachers(data.teachers || []);
      setFilteredTeachers(data.teachers || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeacher = async () => {
    if (!createForm.name || !createForm.email || !createForm.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    const loadingToast = toast.loading('Creating teacher account...');

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

      toast.success('Teacher account created successfully!', { id: loadingToast });
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
      toast.error(error.response?.data?.error || 'Failed to create teacher account', {
        id: loadingToast,
      });
    }
  };

  const fetchTeacherDetails = async (teacherId: string) => {
    try {
      setDetailsLoading(true);
      const data = await apiClient.get(`/admin/teachers/${teacherId}`);
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
      const data = await apiClient.get('/admin/teacher-session-trends', {
        params: { months: trendPeriod },
      });
      setTrendsData(data.trends || []);
      setTeacherNames(data.teachers || []);
    } catch (error) {
      console.error('Error fetching teacher trends:', error);
    }
  };

  const handleSelectTeacher = (teacher: TeacherWithDetails) => {
    setSelectedTeacher(teacher);
    fetchTeacherDetails(teacher._id);
  };

  const getDaysSinceLastSession = (teacher: TeacherWithDetails): number | null => {
    if (!teacher.lastSessionDate) return null;

    const daysDiff = Math.floor(
      (new Date().getTime() - new Date(teacher.lastSessionDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysDiff;
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Teacher Management</h1>
        <Button onClick={() => setShowCreateModal(true)} size="lg">
          + Create Teacher
        </Button>
      </div>

      {/* Teacher Sessions Graph */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Teacher Sessions Over Time</CardTitle>
              <CardDescription>Completed sessions by teacher per month</CardDescription>
            </div>
            <Select value={trendPeriod} onValueChange={setTrendPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">Last 6 Months</SelectItem>
                <SelectItem value="12">Last 12 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
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
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Teacher List */}
        <Card>
          <CardHeader>
            <CardTitle>All Teachers ({teachers.length})</CardTitle>
            <CardDescription>Click on a teacher to view details</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search by name, email, phone, or specialties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
              />

              {searchQuery && (
                <p className="text-sm text-gray-600 mt-2">
                  Showing {filteredTeachers.length} of {teachers.length} teachers
                </p>
              )}
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredTeachers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {searchQuery
                    ? 'No teachers found matching your search'
                    : 'No teachers yet'}
                </p>
              ) : (
                filteredTeachers.map((teacher) => {
                  const daysInactive = getDaysSinceLastSession(teacher);

                  return (
                    <div
                      key={teacher._id}
                      onClick={() => handleSelectTeacher(teacher)}
                      className={`border rounded-lg p-4 cursor-pointer transition ${
                        selectedTeacher?._id === teacher._id
                          ? 'border-primary-600 bg-primary-50'
                          : 'hover:border-primary-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{teacher.userId.name}</p>
                            {!teacher.isActive && (
                              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{teacher.userId.email}</p>
                          {teacher.userId.phone && (
                            <p className="text-sm text-gray-500">{teacher.userId.phone}</p>
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
                                Inactive {daysInactive} days
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary-600">
                            {teacher.totalStudents}
                          </p>
                          <p className="text-xs text-gray-500">students</p>
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Profile photo */}
                    <div className="flex-shrink-0">
                      {selectedTeacher.imageUrl ? (
                        <img
                          src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${selectedTeacher.imageUrl}`}
                          alt="Profile"
                          className="w-16 h-16 rounded-full object-cover border-4 border-primary-100 shadow-md"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-500 border-4 border-gray-300">
                          {selectedTeacher.userId.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <CardTitle>{selectedTeacher.userId.name}</CardTitle>
                      <CardDescription>{selectedTeacher.userId.email}</CardDescription>
                    </div>
                  </div>
                  {!selectedTeacher.isActive && (
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm font-medium">
                      Inactive
                    </span>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <p className="text-2xl font-bold text-gray-800">
                      {selectedTeacher.completedSessions}
                    </p>
                    <p className="text-xs text-gray-500">Completed</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded">
                    <p className="text-2xl font-bold text-blue-600">
                      {selectedTeacher.todaySessions}
                    </p>
                    <p className="text-xs text-gray-500">Today</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded">
                    <p className="text-2xl font-bold text-green-600">
                      {selectedTeacher.thisWeekSessions}
                    </p>
                    <p className="text-xs text-gray-500">This Week</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded">
                    <p className="text-2xl font-bold text-purple-600">
                      {selectedTeacher.totalStudents}
                    </p>
                    <p className="text-xs text-gray-500">Students</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="students">Students</TabsTrigger>
                    <TabsTrigger value="sessions">Sessions</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                  </TabsList>

                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Email</p>
                        <p className="text-sm">{selectedTeacher.userId.email}</p>
                      </div>
                      {selectedTeacher.userId.phone && (
                        <div>
                          <p className="text-sm font-medium text-gray-600">Phone</p>
                          <p className="text-sm">{selectedTeacher.userId.phone}</p>
                        </div>
                      )}
                      {selectedTeacher.hourlyRate && (
                        <div>
                          <p className="text-sm font-medium text-gray-600">Hourly Rate</p>
                          <p className="text-sm">฿{selectedTeacher.hourlyRate}</p>
                        </div>
                      )}
                      {selectedTeacher.defaultLocation && (
                        <div>
                          <p className="text-sm font-medium text-gray-600">Location</p>
                          <p className="text-sm">{selectedTeacher.defaultLocation}</p>
                        </div>
                      )}
                      {selectedTeacher.bio && (
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-1">Bio</p>
                          <p className="text-sm text-gray-700 p-3 bg-gray-50 rounded">{selectedTeacher.bio}</p>
                        </div>
                      )}
                      {selectedTeacher.specialties.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-2">Specialties</p>
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
                    </div>
                  </TabsContent>

                  {/* Students Tab */}
                  <TabsContent value="students">
                    {detailsLoading ? (
                      <p className="text-gray-500 text-center py-8">Loading...</p>
                    ) : teacherStudents.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No students yet</p>
                    ) : (
                      <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {teacherStudents.map((student) => (
                          <div key={student.customer._id} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{student.customer.userId.name}</p>
                                <p className="text-sm text-gray-600">{student.customer.userId.email}</p>
                                {student.customer.userId.phone && (
                                  <p className="text-sm text-gray-500">{student.customer.userId.phone}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold">
                                  {student.completedBookings}/{student.totalBookings}
                                </p>
                                <p className="text-xs text-gray-500">completed</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Sessions Tab */}
                  <TabsContent value="sessions">
                    {detailsLoading ? (
                      <p className="text-gray-500 text-center py-8">Loading...</p>
                    ) : teacherSessions.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No sessions yet</p>
                    ) : (
                      <div className="space-y-3 max-h-[500px] overflow-y-auto">
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
                                    Student: {session.customerId.userId.name}
                                  </p>
                                  <p className="text-sm text-gray-500">Type: {session.type}</p>
                                  {session.packageId && (
                                    <p className="text-sm text-gray-500">
                                      Package: {session.packageId.name}
                                    </p>
                                  )}
                                </div>
                                <span className={`px-3 py-1 rounded text-xs font-medium ${statusClass}`}>
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
                      <p className="text-gray-500 text-center py-8">Loading...</p>
                    ) : !deepAnalysis ? (
                      <p className="text-gray-500 text-center py-8">No analytics data available</p>
                    ) : (
                      <div className="space-y-6">
                        {/* Average Sessions */}
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Activity Metrics</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="border rounded-lg p-4 text-center">
                              <p className="text-3xl font-bold text-primary-600">
                                {deepAnalysis.avgSessionsPerDay}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">Avg Sessions/Day</p>
                            </div>
                            <div className="border rounded-lg p-4 text-center">
                              <p className="text-3xl font-bold text-blue-600">
                                {deepAnalysis.avgSessionsPerMonth}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">Avg Sessions/Month</p>
                            </div>
                          </div>
                        </div>

                        {/* Top Clients */}
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Top Clients</h3>
                          {deepAnalysis.topClients.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No clients yet</p>
                          ) : (
                            <div className="space-y-2">
                              {deepAnalysis.topClients.map((client, idx) => (
                                <div key={idx} className="border rounded-lg p-3 flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">{client.name}</p>
                                    <p className="text-sm text-gray-600">{client.email}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xl font-bold text-primary-600">
                                      {client.completedSessions}
                                    </p>
                                    <p className="text-xs text-gray-500">sessions</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Popular Package Types */}
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Popular Package Types</h3>
                          {deepAnalysis.popularPackageTypes.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No package data</p>
                          ) : (
                            <div className="space-y-2">
                              {deepAnalysis.popularPackageTypes.map((pkg, idx) => (
                                <div key={idx} className="border rounded-lg p-3 flex items-center justify-between">
                                  <span className="text-sm font-medium capitalize">{pkg.type}</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-32 bg-gray-200 rounded-full h-2">
                                      <div
                                        className="bg-primary-600 h-2 rounded-full"
                                        style={{
                                          width: `${(pkg.count / deepAnalysis.popularPackageTypes[0].count) * 100}%`,
                                        }}
                                      />
                                    </div>
                                    <span className="text-sm font-bold w-12 text-right">{pkg.count}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Popular Session Types */}
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Popular Session Types</h3>
                          {deepAnalysis.popularSessionTypes.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No session data</p>
                          ) : (
                            <div className="space-y-2">
                              {deepAnalysis.popularSessionTypes.map((sessionType, idx) => (
                                <div key={idx} className="border rounded-lg p-3 flex items-center justify-between">
                                  <span className="text-sm font-medium capitalize">{sessionType.type}</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-32 bg-gray-200 rounded-full h-2">
                                      <div
                                        className="bg-blue-600 h-2 rounded-full"
                                        style={{
                                          width: `${(sessionType.count / deepAnalysis.popularSessionTypes[0].count) * 100}%`,
                                        }}
                                      />
                                    </div>
                                    <span className="text-sm font-bold w-12 text-right">{sessionType.count}</span>
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
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">Select a teacher to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Teacher Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Create Teacher Account</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="teacher@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="+66..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    value={createForm.yearsOfExperience}
                    onChange={(e) => setCreateForm({ ...createForm, yearsOfExperience: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="5"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  value={createForm.bio}
                  onChange={(e) => setCreateForm({ ...createForm, bio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Brief bio..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specialties
                </label>
                <input
                  type="text"
                  value={createForm.specialties}
                  onChange={(e) => setCreateForm({ ...createForm, specialties: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Reformer, Mat, Props (comma separated)"
                />
                <p className="text-xs text-gray-500 mt-1">Separate multiple specialties with commas</p>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTeacher}
                  className="flex-1"
                >
                  Create Teacher
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toaster position="top-right" />
    </div>
  );
}
