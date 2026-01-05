'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { apiClient } from '@/lib/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatStudioTime } from '@/lib/date';

interface Student {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  dateOfBirth?: string;
  height?: number;
  weight?: number;
  gender?: string;
  profilePhoto?: string;
  healthNotes?: string;
  medicalNotes?: string;
  emergencyContact?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  packages: Array<{
    _id: string;
    name: string;
    type: string;
    totalSessions: number;
    remainingSessions: number;
    status: string;
  }>;
  totalSessions: number;
  completedSessions: number;
}

interface Session {
  _id: string;
  startTime: string;
  endTime: string;
  status: string;
  type: string;
  notes?: string;
  packageId?: {
    name: string;
    type: string;
  };
}

export default function TeacherStudentsPage() {
  const { t } = useTranslation('teacher');
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [addSessionDialog, setAddSessionDialog] = useState(false);
  const [bookFutureDialog, setBookFutureDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [studentSessions, setStudentSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Add Session Form State
  const [sessionForm, setSessionForm] = useState({
    packageId: '',
    sessionDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
    sessionTime: '09:00',
    notes: '',
  });

  // Future booking form state
  const [futureBookingForm, setFutureBookingForm] = useState({
    packageId: '',
    selectedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    selectedTime: '', // No default time selected
    notes: '',
  });

  // Availability state for booking future sessions
  const [timeSlotAvailability, setTimeSlotAvailability] = useState<Map<string, any>>(new Map());
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [blockedSlots, setBlockedSlots] = useState<Set<string>>(new Set());
  const [partialSlots, setPartialSlots] = useState<Set<string>>(new Set());
  const [bookingDetails, setBookingDetails] = useState<Map<string, any>>(new Map());
  const [currentTeacherId, setCurrentTeacherId] = useState<string>(''); // The logged-in teacher's ID

  useEffect(() => {
    fetchStudents();
    fetchCurrentTeacher();
  }, []);

  useEffect(() => {
    let filtered = [...students];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((student) => {
        const name = student.userId.name?.toLowerCase() || '';
        const email = student.userId.email?.toLowerCase() || '';
        const phone = student.userId.phone?.toLowerCase() || '';
        return name.includes(query) || email.includes(query) || phone.includes(query);
      });
    }

    setFilteredStudents(filtered);
  }, [searchQuery, students]);

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentSessions(selectedStudent._id);
    } else {
      setStudentSessions([]);
    }
  }, [selectedStudent]);

  // Automatically fetch availability when package is selected and teacher ID is available
  useEffect(() => {
    if (futureBookingForm.packageId && currentTeacherId && bookFutureDialog) {
      fetchAvailabilityForDate(futureBookingForm.selectedDate);
    }
  }, [futureBookingForm.packageId, currentTeacherId, bookFutureDialog]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data: any = await apiClient.get('/teachers/students');
      setStudents(data.students || []);
      setFilteredStudents(data.students || []);

      // If a student is currently selected, update it with fresh data
      if (selectedStudent) {
        const updatedStudent = data.students.find(
          (s: Student) => s._id === selectedStudent._id
        );
        if (updatedStudent) {
          setSelectedStudent(updatedStudent);
        }
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentTeacher = async () => {
    try {
      const data: any = await apiClient.get('/teachers/me');
      if (data.teacher && data.teacher._id) {
        setCurrentTeacherId(data.teacher._id);
      }
    } catch (error) {
      console.error('Error fetching current teacher:', error);
    }
  };

  const fetchStudentSessions = async (customerId: string) => {
    try {
      setSessionsLoading(true);
      const data: any = await apiClient.get(`/teachers/sessions`, {
        params: { customerId },
      });
      setStudentSessions(data.sessions || []);
    } catch (error) {
      console.error('Error fetching student sessions:', error);
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchAvailabilityForDate = async (date: Date) => {
    if (!futureBookingForm.packageId || !currentTeacherId) return;

    try {
      setLoadingAvailability(true);
      const selectedPackage = selectedStudent?.packages.find(pkg => pkg._id === futureBookingForm.packageId);
      if (!selectedPackage) return;

      const startOfDayDate = new Date(date);
      startOfDayDate.setHours(0, 0, 0, 0);
      const endOfDayDate = new Date(date);
      endOfDayDate.setHours(23, 59, 59, 999);

      // Fetch availability for the logged-in teacher (EXACTLY like customers do)
      const response: any = await apiClient.get('/bookings/availability', {
        params: {
          teacherId: currentTeacherId, // Pass the logged-in teacher's ID (Michael Chan)
          from: startOfDayDate.toISOString(),
          to: endOfDayDate.toISOString(),
        },
      });

      const slots = response.slots || [];
      const availability = new Map<string, any>();
      const blocked = new Set<string>();
      const partial = new Set<string>();
      const details = new Map<string, any>();

      const myPackageType = selectedPackage.type;

      slots.forEach((slot: any) => {
        const slotStart = new Date(slot.startTime);
        const startHour = slotStart.getHours();
        const time = `${startHour.toString().padStart(2, '0')}:00`;

        availability.set(time, slot);

        if (slot.status === 'blocked') {
          blocked.add(time);
        } else if (slot.status === 'partial') {
          // Check if my package type is allowed
          if (slot.allowedTypes && slot.allowedTypes.includes(myPackageType)) {
            partial.add(time);
          } else {
            blocked.add(time);
          }
        }

        // Store booking details for tooltip
        if (slot.bookings && slot.bookings.length > 0) {
          details.set(time, {
            bookings: slot.bookings,
            status: slot.status,
            blockReason: slot.blockReason,
            teacherCount: slot.teacherCount,
          });
        }
      });

      setTimeSlotAvailability(availability);
      setBlockedSlots(blocked);
      setPartialSlots(partial);
      setBookingDetails(details);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleBookFutureSession = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStudent || !futureBookingForm.packageId) {
      alert('Please select a package');
      return;
    }

    if (!futureBookingForm.selectedTime) {
      alert('Please select a time slot');
      return;
    }

    // Check if time slot is blocked
    if (blockedSlots.has(futureBookingForm.selectedTime)) {
      const confirmBooking = confirm(
        'WARNING: This time slot is fully booked. Booking this session may cause scheduling conflicts. Do you want to proceed anyway?'
      );
      if (!confirmBooking) {
        return;
      }
    }

    const [hours, minutes] = futureBookingForm.selectedTime.split(':').map(Number);
    const selectedDateTime = new Date(futureBookingForm.selectedDate);
    selectedDateTime.setHours(hours, minutes, 0, 0);

    try {
      await apiClient.post('/teachers/sessions/manual', {
        customerId: selectedStudent._id,
        packageId: futureBookingForm.packageId,
        sessionDate: selectedDateTime.toISOString(),
        notes: futureBookingForm.notes,
      });

      alert('Session booked successfully!');
      setBookFutureDialog(false);
      setFutureBookingForm({
        packageId: '',
        selectedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        selectedTime: '',
        notes: '',
      });
      fetchStudents();
      if (selectedStudent) {
        fetchStudentSessions(selectedStudent._id);
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to book session');
    }
  };

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStudent || !sessionForm.packageId || !sessionForm.sessionDate || !sessionForm.sessionTime) {
      alert('Please fill in all required fields');
      return;
    }

    // Find the selected package
    const selectedPackage = selectedStudent.packages.find(
      (pkg) => pkg._id === sessionForm.packageId
    );

    if (!selectedPackage) {
      alert('Selected package not found');
      return;
    }

    // Combine date and time
    const [hours, minutes] = sessionForm.sessionTime.split(':').map(Number);
    const selectedDateTime = new Date(sessionForm.sessionDate);
    selectedDateTime.setHours(hours, minutes, 0, 0);

    // Validate time is between 7 AM and 10 PM
    if (hours < 7 || hours >= 22) {
      alert('Session time must be between 7:00 AM and 10:00 PM');
      return;
    }

    // Check if booking a fully booked future slot
    const isFuture = selectedDateTime > new Date();
    if (isFuture && timeSlotAvailability.size > 0) {
      const slot = timeSlotAvailability.get(sessionForm.sessionTime);
      if (slot && slot.status === 'blocked') {
        const confirmBooking = confirm(
          'WARNING: This time slot is fully booked. Booking this session may cause scheduling conflicts. Do you want to proceed anyway?'
        );
        if (!confirmBooking) {
          return;
        }
      }
    }

    try {
      await apiClient.post('/teachers/sessions/manual', {
        customerId: selectedStudent._id,
        packageId: sessionForm.packageId,
        sessionDate: selectedDateTime.toISOString(),
        notes: sessionForm.notes,
      });

      alert('Session added successfully!');
      setAddSessionDialog(false);
      setSessionForm({
        packageId: '',
        sessionDate: new Date().toISOString().split('T')[0],
        sessionTime: '09:00',
        notes: ''
      });
      fetchStudents();
      // Refresh session history for this student
      if (selectedStudent) {
        fetchStudentSessions(selectedStudent._id);
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to add session');
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-6 md:py-8">{t('students.loading')}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">{t('students.title')}</h1>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        {/* Left: Student List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg md:text-xl">{t('students.all_students')} ({students.length})</CardTitle>
                <CardDescription className="text-xs md:text-sm">{t('students.click_to_view')}</CardDescription>
              </div>
              <Button
                onClick={() => {
                  fetchStudents();
                  if (selectedStudent) {
                    fetchStudentSessions(selectedStudent._id);
                  }
                }}
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-xs">Refresh</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder={t('students.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 text-xs md:text-sm"
              />

              {searchQuery && (
                <p className="text-xs md:text-sm text-gray-600 mt-2">
                  {t('students.showing')} {filteredStudents.length} {t('students.of')} {students.length} {t('students.students')}
                </p>
              )}
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredStudents.length === 0 ? (
                <p className="text-gray-500 text-center py-8 text-xs md:text-sm">
                  {searchQuery
                    ? t('students.no_match')
                    : t('students.no_students')}
                </p>
              ) : (
                filteredStudents.map((student) => {
                  const activePackages = student.packages.filter((pkg) => pkg.status === 'active');

                  return (
                    <div
                      key={student._id}
                      onClick={() => setSelectedStudent(student)}
                      className={`border rounded-lg p-3 md:p-4 cursor-pointer transition ${
                        selectedStudent?._id === student._id
                          ? 'border-primary-600 bg-primary-50'
                          : 'hover:border-primary-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-sm md:text-base">{student.userId.name}</p>
                          <p className="text-xs md:text-sm text-gray-600">{student.userId.email}</p>
                          {student.userId.phone && (
                            <p className="text-xs md:text-sm text-gray-500">{student.userId.phone}</p>
                          )}

                          {/* Status badges */}
                          <div className="flex gap-2 mt-2">
                            {activePackages.length === 0 && (
                              <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">
                                {t('students.no_active_packages')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl md:text-2xl font-bold text-primary-600">
                            {student.completedSessions}
                          </p>
                          <p className="text-xs text-gray-500">{t('students.sessions')}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right: Student Details */}
        <div>
          {selectedStudent ? (
            <div className="space-y-4 md:space-y-6">
              {/* Student Info */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 md:gap-4">
                      {selectedStudent.profilePhoto ? (
                        selectedStudent.profilePhoto.startsWith('http') ? (
                          <img
                            src={selectedStudent.profilePhoto}
                            alt={selectedStudent.userId.name}
                            className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover border-2 border-primary-200"
                          />
                        ) : (
                          <img
                            src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${selectedStudent.profilePhoto}`}
                            alt={selectedStudent.userId.name}
                            className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover border-2 border-primary-200"
                          />
                        )
                      ) : (
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xl md:text-2xl font-bold">
                          {selectedStudent.userId.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <CardTitle className="text-lg md:text-xl">{selectedStudent.userId.name}</CardTitle>
                    </div>
                    {(() => {
                      const activePackages = selectedStudent.packages.filter((pkg) => pkg.status === 'active' && pkg.remainingSessions > 0);
                      console.log('Active packages with remaining sessions:', activePackages);
                      console.log('All packages:', selectedStudent.packages);
                      return activePackages.length > 0;
                    })() && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          onClick={() => setBookFutureDialog(true)}
                          size="sm"
                          variant="default"
                          className="w-full sm:w-auto"
                        >
                          <span className="text-xs md:text-sm">{t('students.book_future')}</span>
                        </Button>
                        <Button
                          onClick={() => setAddSessionDialog(true)}
                          size="sm"
                          variant="outline"
                          className="w-full sm:w-auto"
                        >
                          <span className="text-xs md:text-sm">{t('students.record_past')}</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Basic Info */}
                    {(selectedStudent.dateOfBirth || selectedStudent.gender || selectedStudent.height || selectedStudent.weight) && (
                      <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                        {selectedStudent.dateOfBirth && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">{t('students.age')}</p>
                            <p className="font-medium">{new Date().getFullYear() - new Date(selectedStudent.dateOfBirth).getFullYear()} {t('students.years')}</p>
                          </div>
                        )}
                        {selectedStudent.gender && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">{t('students.gender')}</p>
                            <p className="font-medium capitalize">{selectedStudent.gender}</p>
                          </div>
                        )}
                        {selectedStudent.height && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">{t('students.height')}</p>
                            <p className="font-medium">{selectedStudent.height} {t('students.cm')}</p>
                          </div>
                        )}
                        {selectedStudent.weight && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">{t('students.weight')}</p>
                            <p className="font-medium">{selectedStudent.weight} {t('students.kg')}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Contact Info */}
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="font-medium text-gray-500">{t('students.email')}:</span>{' '}
                        <span className="text-gray-900">{selectedStudent.userId.email}</span>
                      </p>
                      {selectedStudent.userId.phone && (
                        <a
                          href={`https://line.me/ti/p/~${selectedStudent.userId.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-green-600 hover:text-green-700 hover:underline transition-colors text-sm"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                          </svg>
                          {selectedStudent.userId.phone}
                        </a>
                      )}
                      {(selectedStudent.emergencyContactName && selectedStudent.emergencyContactPhone) && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-gray-500 whitespace-nowrap">{t('students.emergencyContact')}:</span>
                          <span className="text-gray-900">{selectedStudent.emergencyContactName}</span>
                          <span className="text-gray-400">-</span>
                          <a
                            href={`https://line.me/ti/p/~${selectedStudent.emergencyContactPhone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:underline transition-colors"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                            </svg>
                            {selectedStudent.emergencyContactPhone}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Medical Notes */}
                    {(selectedStudent.healthNotes || selectedStudent.medicalNotes) && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded">
                        <p className="text-xs font-medium text-red-600 mb-1">{t('students.medicalConditions')}</p>
                        <p className="text-sm text-red-700">{selectedStudent.healthNotes || selectedStudent.medicalNotes}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-800">
                          {selectedStudent.totalSessions}
                        </p>
                        <p className="text-xs text-gray-500">{t('students.totalSessions')}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {selectedStudent.completedSessions}
                        </p>
                        <p className="text-xs text-gray-500">{t('students.completed')}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Packages */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('students.packages')} ({selectedStudent.packages.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedStudent.packages.length === 0 ? (
                    <p className="text-gray-500">{t('students.noPackages')}</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedStudent.packages.map((pkg) => (
                        <div key={pkg._id} className="border rounded-lg p-3">
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
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold">
                                {pkg.remainingSessions}/{pkg.totalSessions}
                              </p>
                              <p className="text-xs text-gray-500">{t('students.remaining')}</p>
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
                                {pkg.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Session History */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('students.sessionHistory')} ({studentSessions.length})</CardTitle>
                  <CardDescription>{t('students.sessionHistoryDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {sessionsLoading ? (
                    <p className="text-gray-500 text-center py-8">{t('students.loadingSessions')}</p>
                  ) : studentSessions.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">{t('students.noSessions')}</p>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {studentSessions.map((session) => {
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
                                <div className="flex gap-2 mt-2">
                                  <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded capitalize">
                                    {session.type}
                                  </span>
                                  {session.packageId && (
                                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                      {session.packageId.name}
                                    </span>
                                  )}
                                </div>
                                {session.notes && (
                                  <p className="text-sm text-gray-500 mt-2 italic">
                                    "{session.notes}"
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
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">{t('students.selectStudent')}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Session Dialog */}
      <Dialog open={addSessionDialog} onOpenChange={setAddSessionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('students.recordPastSession')} {selectedStudent?.userId.name}</DialogTitle>
            <DialogDescription>
              {t('students.recordPastSessionDesc')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSession}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('students.package')} *
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={sessionForm.packageId}
                  onChange={(e) =>
                    setSessionForm({ ...sessionForm, packageId: e.target.value })
                  }
                  required
                >
                  <option value="">{t('students.selectPackage')}</option>
                  {selectedStudent?.packages
                    .filter((pkg) => pkg.status === 'active' && pkg.remainingSessions > 0)
                    .map((pkg) => (
                      <option key={pkg._id} value={pkg._id}>
                        {pkg.name} ({pkg.remainingSessions} {t('students.sessionsRemaining')})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('students.sessionDate')} *
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min={(() => {
                    const selectedPkg: any = selectedStudent?.packages.find(p => p._id === sessionForm.packageId);
                    return selectedPkg?.validFrom ? new Date(selectedPkg.validFrom).toISOString().split('T')[0] : undefined;
                  })()}
                  max={(() => {
                    const selectedPkg: any = selectedStudent?.packages.find(p => p._id === sessionForm.packageId);
                    return selectedPkg?.validTo ? new Date(selectedPkg.validTo).toISOString().split('T')[0] : undefined;
                  })()}
                  value={sessionForm.sessionDate}
                  onChange={(e) =>
                    setSessionForm({ ...sessionForm, sessionDate: e.target.value })
                  }
                  required
                />
                {(() => {
                  const selectedPkg: any = selectedStudent?.packages.find(p => p._id === sessionForm.packageId);
                  if (selectedPkg && selectedPkg.validFrom && selectedPkg.validTo) {
                    const validFrom = new Date(selectedPkg.validFrom).toLocaleDateString();
                    const validTo = new Date(selectedPkg.validTo).toLocaleDateString();
                    return (
                      <p className="text-xs text-gray-500 mt-1">
                        {t('students.packageValid')} {validFrom} {t('students.to')} {validTo}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('students.sessionTime')} * (7:00 AM - 10:00 PM)
                  {loadingAvailability && <span className="text-xs text-gray-500 ml-2">{t('students.loadingAvailability')}</span>}
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={sessionForm.sessionTime}
                  onChange={(e) =>
                    setSessionForm({ ...sessionForm, sessionTime: e.target.value })
                  }
                  required
                >
                  {Array.from({ length: 16 }, (_, i) => {
                    const hour = 7 + i;
                    const time = `${hour.toString().padStart(2, '0')}:00`;
                    const displayTime = hour < 12
                      ? `${hour}:00 AM`
                      : hour === 12
                      ? '12:00 PM'
                      : `${hour - 12}:00 PM`;

                    // Check availability for future bookings
                    const selectedDate = new Date(sessionForm.sessionDate);
                    const now = new Date();
                    const isFuture = selectedDate > now;

                    let availabilityLabel = '';
                    if (isFuture && timeSlotAvailability.size > 0) {
                      const slot = timeSlotAvailability.get(time);
                      if (slot) {
                        if (slot.status === 'blocked') {
                          availabilityLabel = ` - ${t('students.fullyBooked')}`;
                        } else if (slot.status === 'partial') {
                          availabilityLabel = ` - ${t('students.limitedAvailability')}`;
                        } else {
                          availabilityLabel = ` - ${t('students.available')}`;
                        }
                      } else {
                        availabilityLabel = ` - ${t('students.available')}`;
                      }
                    }

                    return (
                      <option key={time} value={time}>
                        {displayTime}{availabilityLabel}
                      </option>
                    );
                  })}
                </select>
                {sessionForm.sessionDate && new Date(sessionForm.sessionDate) > new Date() && (
                  <p className="text-xs text-gray-600 mt-1">
                    <span className="text-green-600">● {t('students.available')}</span>
                    {' | '}
                    <span className="text-yellow-600">● {t('students.limited')}</span>
                    {' | '}
                    <span className="text-red-600">● {t('students.fullyBooked')}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('students.notes')}
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  value={sessionForm.notes}
                  onChange={(e) =>
                    setSessionForm({ ...sessionForm, notes: e.target.value })
                  }
                  placeholder={t('students.notesPlaceholder')}
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAddSessionDialog(false);
                  setSessionForm({
                    packageId: '',
                    sessionDate: new Date().toISOString().split('T')[0],
                    sessionTime: '09:00',
                    notes: ''
                  });
                }}
              >
                {t('students.cancel')}
              </Button>
              <Button type="submit">{t('students.addSession')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Book Future Session Dialog */}
      <Dialog open={bookFutureDialog} onOpenChange={setBookFutureDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('students.bookFutureSession')} {selectedStudent?.userId.name}</DialogTitle>
            <DialogDescription>
              {t('students.bookFutureSessionDesc')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBookFutureSession}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('students.package')} *
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={futureBookingForm.packageId}
                  onChange={(e) => {
                    setFutureBookingForm({ ...futureBookingForm, packageId: e.target.value });
                    if (e.target.value) {
                      fetchAvailabilityForDate(futureBookingForm.selectedDate);
                    }
                  }}
                  required
                >
                  <option value="">{t('students.selectPackage')}</option>
                  {selectedStudent?.packages
                    .filter((pkg) => pkg.status === 'active' && pkg.remainingSessions > 0)
                    .map((pkg) => (
                      <option key={pkg._id} value={pkg._id}>
                        {pkg.name} ({pkg.remainingSessions} {t('students.sessionsRemaining')})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('students.selectDate')} *
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min={(() => {
                    const selectedPkg: any = selectedStudent?.packages.find(p => p._id === futureBookingForm.packageId);
                    return selectedPkg?.validFrom ? new Date(selectedPkg.validFrom).toISOString().split('T')[0] : undefined;
                  })()}
                  max={(() => {
                    const selectedPkg: any = selectedStudent?.packages.find(p => p._id === futureBookingForm.packageId);
                    return selectedPkg?.validTo ? new Date(selectedPkg.validTo).toISOString().split('T')[0] : undefined;
                  })()}
                  value={futureBookingForm.selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    setFutureBookingForm({ ...futureBookingForm, selectedDate: newDate });
                    if (futureBookingForm.packageId) {
                      fetchAvailabilityForDate(newDate);
                    }
                  }}
                  required
                />
                {(() => {
                  const selectedPkg: any = selectedStudent?.packages.find(p => p._id === futureBookingForm.packageId);
                  if (selectedPkg && selectedPkg.validFrom && selectedPkg.validTo) {
                    const validFrom = new Date(selectedPkg.validFrom).toLocaleDateString();
                    const validTo = new Date(selectedPkg.validTo).toLocaleDateString();
                    return (
                      <p className="text-xs text-gray-500 mt-1">
                        {t('students.packageValid')} {validFrom} {t('students.to')} {validTo}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('students.selectTime')} * (7:00 AM - 10:00 PM)
                  {loadingAvailability && <span className="text-xs text-gray-500 ml-2">{t('students.loading')}</span>}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 16 }, (_, i) => {
                    const hour = 7 + i;
                    const time = `${hour.toString().padStart(2, '0')}:00`;
                    const displayTime = hour < 12
                      ? `${hour}:00 AM`
                      : hour === 12
                      ? '12:00 PM'
                      : `${hour - 12}:00 PM`;

                    const isBlocked = blockedSlots.has(time);
                    const isPartial = partialSlots.has(time);
                    const isSelected = futureBookingForm.selectedTime === time;
                    const details = bookingDetails.get(time);
                    const hasBookings = details && details.bookings && details.bookings.length > 0;

                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setFutureBookingForm({ ...futureBookingForm, selectedTime: time })}
                        className={`px-3 py-2 border rounded text-sm font-medium transition relative group ${
                          isSelected
                            ? 'bg-primary-600 text-white border-primary-600'
                            : isBlocked
                            ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                            : isPartial
                            ? 'bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100'
                            : 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
                        }`}
                      >
                        {displayTime}

                        {/* Hover tooltip for blocked and partial slots */}
                        {(isBlocked || isPartial || hasBookings) && (() => {
                          // Filter out BLOCKED bookings - they're not relevant
                          const relevantBookings = details?.bookings?.filter((b: any) => b.type !== 'blocked') || [];
                          const hasRelevantBookings = relevantBookings.length > 0;

                          // Only show tooltip if there are relevant bookings
                          if (!hasRelevantBookings && !isBlocked && !isPartial) {
                            return null;
                          }

                          // Get the selected package type to provide context-aware messages
                          const selectedPkg: any = selectedStudent?.packages.find((p) => p._id === futureBookingForm.packageId);
                          const myPackageType = selectedPkg?.type || 'private';

                          // Determine the appropriate message based on slot status and package type
                          let statusMessage = '';
                          let statusColor = '';

                          if (details?.status === 'blocked') {
                            if (isBlocked) {
                              // Fully blocked for the logged-in teacher
                              statusMessage = details.blockReason || 'Fully Booked';
                              statusColor = 'text-red-300';
                            }
                          } else if (isPartial) {
                            // Partial availability - check if package type is allowed
                            if (myPackageType === 'group') {
                              statusMessage = 'Cannot book GROUP session when another teacher is already booked';
                              statusColor = 'text-yellow-300';
                            } else {
                              statusMessage = 'You can still book this slot (Private/Duo only)';
                              statusColor = 'text-green-300';
                            }
                          }

                          return (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                              {hasRelevantBookings || details?.blockReason ? (
                                <>
                                  {statusMessage && (
                                    <div className={`font-semibold mb-1 ${statusColor}`}>
                                      {statusMessage}
                                    </div>
                                  )}
                                  {relevantBookings.length > 0 && (
                                    <div className="text-xs text-gray-300 mb-1">Other bookings:</div>
                                  )}
                                  {relevantBookings.map((booking: any, idx: number) => (
                                    <div key={idx} className="text-xs">
                                      Teacher: {booking.teacherName} - {
                                        booking.type === 'private' ? 'Private' :
                                        booking.type === 'group' ? 'Group' :
                                        booking.type === 'duo' ? 'Duo' :
                                        booking.type || 'N/A'
                                      }
                                    </div>
                                  ))}
                                </>
                              ) : (
                                <div>No info available</div>
                              )}
                              {/* Arrow */}
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                <div className="border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          );
                        })()}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    {t('students.available')}
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                    {t('students.limited')}
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    {t('students.fullyBooked')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('students.notes')}
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  value={futureBookingForm.notes}
                  onChange={(e) =>
                    setFutureBookingForm({ ...futureBookingForm, notes: e.target.value })
                  }
                  placeholder={t('students.notesPlaceholder')}
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setBookFutureDialog(false);
                  setFutureBookingForm({
                    packageId: '',
                    selectedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                    selectedTime: '',
                    notes: '',
                  });
                }}
              >
                {t('students.cancel')}
              </Button>
              <Button type="submit">{t('students.bookSession')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
