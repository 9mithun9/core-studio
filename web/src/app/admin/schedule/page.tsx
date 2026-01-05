'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import WeekCalendar from '@/components/Calendar/WeekCalendar';
import toast, { Toaster } from 'react-hot-toast';
import { formatStudioTime } from '@/lib/date';
import { addDays, startOfWeek, endOfWeek, set } from 'date-fns';
import { createTeacherColorMap } from '@/lib/teacherColors';

export default function AdminSchedule() {
  const { t } = useTranslation('admin');
  const [events, setEvents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [teacherColorMap, setTeacherColorMap] = useState<Map<string, string>>(new Map());

  // Block form state
  const [blockForm, setBlockForm] = useState({
    teacherId: '',
    blockReason: '',
    blockType: 'single' as 'single' | 'multi-day' | 'recurring',
    startDate: '',
    endDate: '',
    startHour: 7,
    endHour: 8,
    frequency: 'weekly' as 'daily' | 'weekly',
    until: '',
  });

  useEffect(() => {
    fetchTeachersAndEvents();
  }, [selectedTeacher, selectedDate]);

  const fetchTeachersAndEvents = async () => {
    try {
      setLoading(true);

      // Fetch all teachers
      const teachersResponse: any = await apiClient.get('/teachers');
      const teachersList = teachersResponse.teachers || [];
      setTeachers(teachersList);

      // Create color map for teachers - uses consistent hash-based colors
      const colorMap = createTeacherColorMap(teachersList);
      setTeacherColorMap(colorMap);

      await loadEvents(teachersList);
    } catch (err) {
      console.error('Failed to load teachers', err);
      toast.error(t('schedule.errors.failedToLoadCalendar'));
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async (teachersList: any[]) => {
    try {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const end = endOfWeek(addDays(start, 14), { weekStartsOn: 1 }); // 2 weeks

      let allEvents: any[] = [];

      if (selectedTeacher === 'all') {
        // Fetch events for all teachers
        const promises = teachersList.map((teacher) =>
          apiClient.get(`/bookings?teacherId=${teacher._id}&from=${start.toISOString()}&to=${end.toISOString()}`)
        );
        const responses: any[] = await Promise.all(promises);

        responses.forEach((response, index) => {
          const teacherEvents = (response.bookings || [])
            .filter((event: any) => event.status !== 'cancelled' && event.status !== 'rejected')
            .map((event: any) => ({
              ...event,
              teacherColor: teacherColorMap.get(teachersList[index]._id),
            }));
          allEvents = [...allEvents, ...teacherEvents];
        });
      } else {
        // Fetch events for selected teacher
        const response: any = await apiClient.get(
          `/bookings?teacherId=${selectedTeacher}&from=${start.toISOString()}&to=${end.toISOString()}`
        );
        allEvents = (response.bookings || [])
          .filter((event: any) => event.status !== 'cancelled' && event.status !== 'rejected')
          .map((event: any) => ({
            ...event,
            teacherColor: teacherColorMap.get(selectedTeacher),
          }));
      }

      setEvents(allEvents);
    } catch (err) {
      console.error('Failed to load events', err);
    }
  };

  const handleSlotClick = (date: Date, hour: number) => {
    setSelectedSlot({ date, hour });
    setShowBlockModal(true);
    setBlockForm({
      teacherId: selectedTeacher === 'all' ? '' : selectedTeacher,
      blockReason: '',
      blockType: 'single',
      startDate: date.toISOString().split('T')[0],
      endDate: date.toISOString().split('T')[0],
      startHour: hour,
      endHour: hour + 1,
      frequency: 'weekly',
      until: '',
    });
  };

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const handleBlockTime = async () => {
    if (!blockForm.teacherId) {
      toast.error(t('schedule.toasts.selectTeacher'));
      return;
    }

    const loadingToast = toast.loading(t('schedule.toasts.blockingTime'));

    try {
      // Determine which teachers to block
      const teacherIds = blockForm.teacherId === 'all-teachers'
        ? teachers.map(t => t._id)
        : [blockForm.teacherId];

      if (blockForm.blockType === 'multi-day') {
        // Multi-day blocking: Block entire days from start to end date
        const startDate = new Date(blockForm.startDate);
        const endDate = new Date(blockForm.endDate);
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff < 0) {
          toast.error(t('schedule.toasts.endDateError'), { id: loadingToast });
          return;
        }

        // Create blocks for each hour (9 AM to 8 PM) for each day for each teacher
        const promises = [];
        const allHours = Array.from({ length: 12 }, (_, i) => i + 9); // 9 to 20 (8 PM)

        for (const teacherId of teacherIds) {
          for (let i = 0; i <= daysDiff; i++) {
            const currentDate = addDays(startDate, i);

            // Block all hours for the entire day
            for (const hour of allHours) {
              const startTime = set(currentDate, { hours: hour, minutes: 0, seconds: 0 });
              const endTime = set(currentDate, { hours: hour + 1, minutes: 0, seconds: 0 });

              const payload = {
                teacherId,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                blockReason: blockForm.blockReason || 'Holiday/Time off',
              };
              promises.push(apiClient.post('/bookings/block', payload));
            }
          }
        }

        await Promise.all(promises);
        const teacherText = blockForm.teacherId === 'all-teachers' ? t('schedule.toasts.forAllTeachers') : '';
        toast.success(t('schedule.toasts.blockedDaysSuccess', { days: daysDiff + 1, teachers: teacherText }), {
          id: loadingToast,
          duration: 3000,
        });
      } else if (blockForm.blockType === 'recurring') {
        // Recurring blocking
        const startDate = new Date(blockForm.startDate);
        const startTime = set(startDate, { hours: blockForm.startHour, minutes: 0, seconds: 0 });
        const endTime = set(startDate, { hours: blockForm.endHour, minutes: 0, seconds: 0 });

        const promises = teacherIds.map(teacherId => {
          const payload: any = {
            teacherId,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            blockReason: blockForm.blockReason || 'Time blocked by admin',
            recurring: {
              enabled: true,
              frequency: blockForm.frequency,
              until: blockForm.until ? new Date(blockForm.until).toISOString() : undefined,
            },
          };
          return apiClient.post('/bookings/block', payload);
        });

        await Promise.all(promises);
        const teacherText = blockForm.teacherId === 'all-teachers' ? t('schedule.toasts.forAllTeachers') : '';
        toast.success(t('schedule.toasts.recurringBlocksCreated', { teachers: teacherText }), {
          id: loadingToast,
          duration: 3000,
        });
      } else {
        // Single time block
        const startDate = new Date(blockForm.startDate);
        const startTime = set(startDate, { hours: blockForm.startHour, minutes: 0, seconds: 0 });
        const endTime = set(startDate, { hours: blockForm.endHour, minutes: 0, seconds: 0 });

        const promises = teacherIds.map(teacherId => {
          const payload = {
            teacherId,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            blockReason: blockForm.blockReason || 'Time blocked by admin',
          };
          return apiClient.post('/bookings/block', payload);
        });

        await Promise.all(promises);
        const teacherText = blockForm.teacherId === 'all-teachers' ? t('schedule.toasts.forAllTeachers') : '';
        toast.success(t('schedule.toasts.timeBlockedSuccess', { teachers: teacherText }), {
          id: loadingToast,
          duration: 3000,
        });
      }

      setShowBlockModal(false);
      setSelectedSlot(null);
      await loadEvents(teachers);
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('schedule.toasts.failedToBlock'), {
        id: loadingToast,
      });
    }
  };

  const handleUnblock = async (eventId: string) => {
    if (!confirm(t('schedule.toasts.unblockConfirm'))) return;

    const loadingToast = toast.loading(t('schedule.toasts.unblockingTime'));

    try {
      await apiClient.delete(`/bookings/block/${eventId}`);

      toast.success(t('schedule.toasts.unblockSuccess'), {
        id: loadingToast,
        duration: 3000,
      });

      setShowEventDetails(false);
      setSelectedEvent(null);
      await loadEvents(teachers);
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('schedule.toasts.failedToUnblock'), {
        id: loadingToast,
      });
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="text-center text-gray-600">{t('schedule.loadingCalendar')}</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-orange-50 pb-12">
      <div className="container mx-auto px-4 py-8">
        {/* Gradient Hero Header */}
        <div className="relative bg-gradient-to-r from-orange-600 to-orange-700 rounded-2xl p-8 text-white overflow-hidden mb-8 shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">{t('schedule.title')}</h1>
              <p className="text-orange-100 text-lg">{t('schedule.subtitle')}</p>
            </div>
            <div className="hidden md:flex gap-3">
              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="px-4 py-2 text-sm border-0 bg-white text-gray-900 rounded-lg shadow-sm"
              >
                <option value="all">{t('schedule.allTeachers')}</option>
                {teachers.map((teacher) => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacher.userId?.name || 'Unknown'}
                  </option>
                ))}
              </select>
              <Button
                onClick={() => {
                  setSelectedSlot({ date: new Date(), hour: 9 });
                  setShowBlockModal(true);
                }}
                className="bg-white text-orange-700 hover:bg-gray-100"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {t('schedule.blockTime')}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Controls */}
        <div className="md:hidden mb-6 flex flex-col gap-3">
          <select
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg"
          >
            <option value="all">{t('schedule.allTeachers')}</option>
            {teachers.map((teacher) => (
              <option key={teacher._id} value={teacher._id}>
                {teacher.userId?.name || 'Unknown'}
              </option>
            ))}
          </select>
          <Button
            onClick={() => {
              setSelectedSlot({ date: new Date(), hour: 9 });
              setShowBlockModal(true);
            }}
            size="sm"
            className="w-full"
          >
            {t('schedule.blockTime')}
          </Button>
        </div>

      {selectedTeacher === 'all' && teachers.length > 0 && (
        <Card className="mb-3 md:mb-4">
          <CardContent className="pt-3 md:pt-4">
            <div className="flex flex-wrap gap-3 md:gap-4">
              <h3 className="w-full text-xs md:text-sm font-semibold text-gray-700">{t('schedule.teacherLegend')}</h3>
              {teachers.map((teacher) => (
                <div key={teacher._id} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 md:w-4 md:h-4 rounded"
                    style={{ backgroundColor: teacherColorMap.get(teacher._id) }}
                  />
                  <span className="text-xs md:text-sm">{teacher.userId?.name || 'Unknown'}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-4 md:mb-6">
        <CardContent className="pt-4 md:pt-6">
          <WeekCalendar
            events={events}
            onSlotClick={handleSlotClick}
            onEventClick={handleEventClick}
            showTeacherColors={selectedTeacher === 'all'}
            teacherColorMap={teacherColorMap}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />
        </CardContent>
      </Card>

      {/* Block Time Modal */}
      {showBlockModal && selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h2 className="text-lg md:text-xl font-bold">{t('schedule.blockTimeModal.title')}</h2>
              <button
                onClick={() => setShowBlockModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 md:space-y-4">
              <div>
                <label className="block text-xs md:text-sm font-medium mb-2">{t('schedule.blockTimeModal.teacher')} *</label>
                <select
                  value={blockForm.teacherId}
                  onChange={(e) => setBlockForm({ ...blockForm, teacherId: e.target.value })}
                  className="w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">{t('schedule.blockTimeModal.selectTeacher')}</option>
                  <option value="all-teachers">🌟 {t('schedule.blockTimeModal.allTeachers')}</option>
                  {teachers.map((teacher) => (
                    <option key={teacher._id} value={teacher._id}>
                      {teacher.userId?.name || 'Unknown'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium mb-2">{t('schedule.blockTimeModal.blockType')}</label>
                <select
                  value={blockForm.blockType}
                  onChange={(e) => setBlockForm({ ...blockForm, blockType: e.target.value as 'single' | 'multi-day' | 'recurring' })}
                  className="w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg"
                >
                  <option value="single">{t('schedule.blockTimeModal.singleTimeSlot')}</option>
                  <option value="multi-day">{t('schedule.blockTimeModal.multipleDays')}</option>
                  <option value="recurring">{t('schedule.blockTimeModal.recurringBlock')}</option>
                </select>
              </div>

              {blockForm.blockType === 'single' && (
                <>
                  <div>
                    <label className="block text-xs md:text-sm font-medium mb-2">{t('schedule.blockTimeModal.date')}</label>
                    <input
                      type="date"
                      value={blockForm.startDate}
                      onChange={(e) => setBlockForm({ ...blockForm, startDate: e.target.value })}
                      className="w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:gap-3">
                    <div>
                      <label className="block text-xs md:text-sm font-medium mb-2">{t('schedule.blockTimeModal.startHour')}</label>
                      <select
                        value={blockForm.startHour}
                        onChange={(e) => setBlockForm({ ...blockForm, startHour: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg"
                      >
                        {Array.from({ length: 16 }, (_, i) => i + 7).map((hour) => (
                          <option key={hour} value={hour}>
                            {hour}:00
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs md:text-sm font-medium mb-2">{t('schedule.blockTimeModal.endHour')}</label>
                      <select
                        value={blockForm.endHour}
                        onChange={(e) => setBlockForm({ ...blockForm, endHour: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg"
                      >
                        {Array.from({ length: 16 }, (_, i) => i + 8).map((hour) => (
                          <option key={hour} value={hour}>
                            {hour}:00
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {blockForm.blockType === 'multi-day' && (
                <>
                  <div className="grid grid-cols-2 gap-2 md:gap-3">
                    <div>
                      <label className="block text-xs md:text-sm font-medium mb-2">{t('schedule.blockTimeModal.startDate')}</label>
                      <input
                        type="date"
                        value={blockForm.startDate}
                        onChange={(e) => setBlockForm({ ...blockForm, startDate: e.target.value })}
                        className="w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs md:text-sm font-medium mb-2">{t('schedule.blockTimeModal.endDate')}</label>
                      <input
                        type="date"
                        value={blockForm.endDate}
                        onChange={(e) => setBlockForm({ ...blockForm, endDate: e.target.value })}
                        className="w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 md:p-3">
                    <p className="text-xs md:text-sm text-blue-800">
                      {t('schedule.blockTimeModal.noteMultiDay')}
                    </p>
                  </div>
                </>
              )}

              {blockForm.blockType === 'recurring' && (
                <>
                  <div>
                    <label className="block text-xs md:text-sm font-medium mb-2">{t('schedule.blockTimeModal.startDate')}</label>
                    <input
                      type="date"
                      value={blockForm.startDate}
                      onChange={(e) => setBlockForm({ ...blockForm, startDate: e.target.value })}
                      className="w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:gap-3">
                    <div>
                      <label className="block text-xs md:text-sm font-medium mb-2">{t('schedule.blockTimeModal.startHour')}</label>
                      <select
                        value={blockForm.startHour}
                        onChange={(e) => setBlockForm({ ...blockForm, startHour: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg"
                      >
                        {Array.from({ length: 16 }, (_, i) => i + 7).map((hour) => (
                          <option key={hour} value={hour}>
                            {hour}:00
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs md:text-sm font-medium mb-2">{t('schedule.blockTimeModal.endHour')}</label>
                      <select
                        value={blockForm.endHour}
                        onChange={(e) => setBlockForm({ ...blockForm, endHour: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg"
                      >
                        {Array.from({ length: 16 }, (_, i) => i + 8).map((hour) => (
                          <option key={hour} value={hour}>
                            {hour}:00
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium mb-2">{t('schedule.blockTimeModal.frequency')}</label>
                    <select
                      value={blockForm.frequency}
                      onChange={(e) => setBlockForm({ ...blockForm, frequency: e.target.value as 'daily' | 'weekly' })}
                      className="w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg"
                    >
                      <option value="daily">{t('schedule.blockTimeModal.daily')}</option>
                      <option value="weekly">{t('schedule.blockTimeModal.weekly')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-medium mb-2">{t('schedule.blockTimeModal.until')}</label>
                    <input
                      type="date"
                      value={blockForm.until}
                      onChange={(e) => setBlockForm({ ...blockForm, until: e.target.value })}
                      className="w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg"
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('schedule.blockTimeModal.untilEmpty')}
                    </p>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs md:text-sm font-medium mb-2">{t('schedule.blockTimeModal.reason')}</label>
                <input
                  type="text"
                  value={blockForm.blockReason}
                  onChange={(e) => setBlockForm({ ...blockForm, blockReason: e.target.value })}
                  className="w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-lg"
                  placeholder={t('schedule.blockTimeModal.reasonPlaceholder')}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 md:gap-3 mt-4 md:mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowBlockModal(false)}
                  className="flex-1 text-xs md:text-sm"
                >
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleBlockTime} className="flex-1 text-xs md:text-sm">
                  {blockForm.blockType === 'multi-day'
                    ? t('schedule.blockTimeModal.blockMultipleDays')
                    : blockForm.blockType === 'recurring'
                    ? t('schedule.blockTimeModal.createRecurringBlocks')
                    : t('schedule.blockTime')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {showEventDetails && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h2 className="text-lg md:text-xl font-bold">
                {selectedEvent.type === 'blocked' ? t('schedule.eventDetails.blockedTime') : t('schedule.eventDetails.sessionDetails')}
              </h2>
              <button
                onClick={() => setShowEventDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-2 md:space-y-3">
              <div>
                <p className="text-xs md:text-sm text-gray-600">{t('schedule.eventDetails.teacher')}</p>
                <p className="text-sm md:text-base font-medium">{selectedEvent.teacherId?.userId?.name || 'Unknown'}</p>
              </div>

              <div>
                <p className="text-xs md:text-sm text-gray-600">{t('schedule.eventDetails.time')}</p>
                <p className="text-sm md:text-base font-medium">
                  {formatStudioTime(selectedEvent.startTime, 'PPP')}
                </p>
                <p className="text-xs md:text-sm text-gray-600">
                  {formatStudioTime(selectedEvent.startTime, 'p')} - {formatStudioTime(selectedEvent.endTime, 'p')}
                </p>
              </div>

              {selectedEvent.type !== 'blocked' && (
                <>
                  <div>
                    <p className="text-xs md:text-sm text-gray-600">{t('schedule.eventDetails.customer')}</p>
                    <p className="text-sm md:text-base font-medium">{selectedEvent.customerId?.userId?.name || 'Unknown'}</p>
                  </div>

                  <div>
                    <p className="text-xs md:text-sm text-gray-600">{t('schedule.eventDetails.type')}</p>
                    <p className="text-sm md:text-base font-medium capitalize">{selectedEvent.type}</p>
                  </div>

                  <div>
                    <p className="text-xs md:text-sm text-gray-600">{t('schedule.eventDetails.status')}</p>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        selectedEvent.status === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : selectedEvent.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {selectedEvent.status}
                    </span>
                  </div>
                </>
              )}

              {selectedEvent.notes && (
                <div>
                  <p className="text-xs md:text-sm text-gray-600">{t('schedule.eventDetails.notes')}</p>
                  <p className="text-xs md:text-sm">{selectedEvent.notes}</p>
                </div>
              )}

              {selectedEvent.type === 'blocked' && (
                <div className="mt-3 md:mt-4">
                  <Button
                    variant="outline"
                    onClick={() => handleUnblock(selectedEvent._id)}
                    className="w-full border-red-300 text-red-600 hover:bg-red-50 text-xs md:text-sm"
                  >
                    {t('schedule.eventDetails.unblockThisTime')}
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-4 md:mt-6">
              <Button variant="outline" onClick={() => setShowEventDetails(false)} className="w-full text-xs md:text-sm">
                {t('common.close')}
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
