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

export default function TeacherMyCalendar() {
  const { t } = useTranslation('teacher');
  const [events, setEvents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('me'); // 'me' or 'all'
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentTeacherId, setCurrentTeacherId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; hour: number } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [teacherColorMap, setTeacherColorMap] = useState<Map<string, string>>(new Map());

  // Block form state
  const [blockForm, setBlockForm] = useState({
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

      // Get current teacher info
      const teacherResponse: any = await apiClient.get('/teachers/me');
      const myTeacherId = teacherResponse.teacher._id;
      setCurrentTeacherId(myTeacherId);

      // Get all teachers
      const teachersResponse: any = await apiClient.get('/teachers');
      const teachersList = teachersResponse.teachers || [];
      setTeachers(teachersList);

      // Assign colors to teachers - uses consistent hash-based colors
      const colorMap = createTeacherColorMap(teachersList);
      setTeacherColorMap(colorMap);

      await loadEvents(teachersList, myTeacherId);
    } catch (err) {
      console.error('Failed to load teacher info', err);
      toast.error(t('my_calendar.errors.load_calendar'));
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async (teachersList: any[], myTeacherId: string) => {
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
        // Fetch events for current teacher only
        const response: any = await apiClient.get(
          `/bookings?teacherId=${myTeacherId}&from=${start.toISOString()}&to=${end.toISOString()}`
        );
        allEvents = (response.bookings || [])
          .filter((event: any) => event.status !== 'cancelled' && event.status !== 'rejected')
          .map((event: any) => ({
            ...event,
            teacherColor: teacherColorMap.get(myTeacherId),
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
    const loadingToast = toast.loading(t('my_calendar.messages.blocking_time'));

    try {
      if (blockForm.blockType === 'multi-day') {
        // Multi-day blocking: Block entire days from start to end date
        const startDate = new Date(blockForm.startDate);
        const endDate = new Date(blockForm.endDate);
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff < 0) {
          toast.error(t('my_calendar.errors.invalid_date_range'), { id: loadingToast });
          return;
        }

        // Create blocks for each day in the range
        const promises = [];
        for (let i = 0; i <= daysDiff; i++) {
          const currentDate = addDays(startDate, i);
          const startTime = set(currentDate, { hours: blockForm.startHour, minutes: 0, seconds: 0 });
          const endTime = set(currentDate, { hours: blockForm.endHour, minutes: 0, seconds: 0 });

          const payload = {
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            blockReason: blockForm.blockReason || t('my_calendar.defaults.holiday_time_off'),
          };
          promises.push(apiClient.post('/bookings/block', payload));
        }

        await Promise.all(promises);
        toast.success(t('my_calendar.messages.blocked_multi_days', { count: daysDiff + 1 }), {
          id: loadingToast,
          duration: 3000,
        });
      } else if (blockForm.blockType === 'recurring') {
        // Recurring blocking
        const startDate = new Date(blockForm.startDate);
        const startTime = set(startDate, { hours: blockForm.startHour, minutes: 0, seconds: 0 });
        const endTime = set(startDate, { hours: blockForm.endHour, minutes: 0, seconds: 0 });

        const payload: any = {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          blockReason: blockForm.blockReason || t('my_calendar.defaults.time_blocked'),
          recurring: {
            enabled: true,
            frequency: blockForm.frequency,
            until: blockForm.until ? new Date(blockForm.until).toISOString() : undefined,
          },
        };

        await apiClient.post('/bookings/block', payload);
        toast.success(t('my_calendar.messages.recurring_blocks_created'), {
          id: loadingToast,
          duration: 3000,
        });
      } else {
        // Single time block
        const startDate = new Date(blockForm.startDate);
        const startTime = set(startDate, { hours: blockForm.startHour, minutes: 0, seconds: 0 });
        const endTime = set(startDate, { hours: blockForm.endHour, minutes: 0, seconds: 0 });

        const payload = {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          blockReason: blockForm.blockReason || t('my_calendar.defaults.time_blocked'),
        };

        await apiClient.post('/bookings/block', payload);
        toast.success(t('my_calendar.messages.time_blocked_success'), {
          id: loadingToast,
          duration: 3000,
        });
      }

      setShowBlockModal(false);
      setSelectedSlot(null);
      await loadEvents(teachers, currentTeacherId);
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('my_calendar.errors.block_time_failed'), {
        id: loadingToast,
      });
    }
  };

  const handleUnblock = async (eventId: string) => {
    if (!confirm(t('my_calendar.confirm.unblock_time'))) return;

    const loadingToast = toast.loading(t('my_calendar.messages.unblocking_time'));

    try {
      await apiClient.delete(`/bookings/block/${eventId}`);

      toast.success(t('my_calendar.messages.time_unblocked_success'), {
        id: loadingToast,
        duration: 3000,
      });

      setShowEventDetails(false);
      setSelectedEvent(null);
      await loadEvents(teachers, currentTeacherId);
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('my_calendar.errors.unblock_time_failed'), {
        id: loadingToast,
      });
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-6 md:py-8">{t('my_calendar.loading')}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t('my_calendar.title')}</h1>
          <p className="text-gray-600 mt-2 text-xs md:text-sm">{t('my_calendar.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setSelectedSlot({ date: new Date(), hour: 9 });
              setShowBlockModal(true);
            }}
            size="sm"
          >
            <span className="text-xs md:text-sm">{t('my_calendar.block_time')}</span>
          </Button>
        </div>
      </div>

      {/* Teacher Filter */}
      <div className="mb-4">
        <label className="block text-xs md:text-sm font-medium mb-2">{t('my_calendar.view_schedule')}:</label>
        <select
          value={selectedTeacher}
          onChange={(e) => setSelectedTeacher(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-xs md:text-sm"
        >
          <option value="me">{t('my_calendar.my_schedule_only')}</option>
          <option value="all">{t('my_calendar.all_teachers')}</option>
        </select>
      </div>

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

      {/* Teacher Legend - Only show when viewing all teachers */}
      {selectedTeacher === 'all' && teachers.length > 0 && (
        <Card className="mb-4 md:mb-6">
          <CardContent className="pt-4 md:pt-6">
            <h3 className="font-semibold mb-3 text-sm md:text-base">{t('my_calendar.teachers')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {teachers.map((teacher) => (
                <div key={teacher._id} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: teacherColorMap.get(teacher._id) }}
                  ></div>
                  <span className="text-xs md:text-sm">{teacher.userId?.name || t('my_calendar.unknown')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Block Time Modal */}
      {showBlockModal && selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold">{t('my_calendar.block_time_title')}</h2>
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
                <label className="block text-xs md:text-sm font-medium mb-2">{t('my_calendar.block_type')}</label>
                <select
                  value={blockForm.blockType}
                  onChange={(e) => setBlockForm({ ...blockForm, blockType: e.target.value as 'single' | 'multi-day' | 'recurring' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs md:text-sm"
                >
                  <option value="single">{t('my_calendar.single_slot')}</option>
                  <option value="multi-day">{t('my_calendar.multiple_days')}</option>
                  <option value="recurring">{t('my_calendar.recurring_block')}</option>
                </select>
              </div>

              {blockForm.blockType === 'single' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('my_calendar.labels.date')}</label>
                    <input
                      type="date"
                      value={blockForm.startDate}
                      onChange={(e) => setBlockForm({ ...blockForm, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('my_calendar.labels.start_hour')}</label>
                      <select
                        value={blockForm.startHour}
                        onChange={(e) => setBlockForm({ ...blockForm, startHour: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        {Array.from({ length: 16 }, (_, i) => i + 7).map((hour) => (
                          <option key={hour} value={hour}>
                            {hour}:00
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('my_calendar.labels.end_hour')}</label>
                      <select
                        value={blockForm.endHour}
                        onChange={(e) => setBlockForm({ ...blockForm, endHour: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('my_calendar.labels.start_date')}</label>
                      <input
                        type="date"
                        value={blockForm.startDate}
                        onChange={(e) => setBlockForm({ ...blockForm, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('my_calendar.labels.end_date')}</label>
                      <input
                        type="date"
                        value={blockForm.endDate}
                        onChange={(e) => setBlockForm({ ...blockForm, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('my_calendar.labels.daily_start_hour')}</label>
                      <select
                        value={blockForm.startHour}
                        onChange={(e) => setBlockForm({ ...blockForm, startHour: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        {Array.from({ length: 16 }, (_, i) => i + 7).map((hour) => (
                          <option key={hour} value={hour}>
                            {hour}:00
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('my_calendar.labels.daily_end_hour')}</label>
                      <select
                        value={blockForm.endHour}
                        onChange={(e) => setBlockForm({ ...blockForm, endHour: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        {Array.from({ length: 16 }, (_, i) => i + 8).map((hour) => (
                          <option key={hour} value={hour}>
                            {hour}:00
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {t('my_calendar.hints.multi_day_block')}
                  </p>
                </>
              )}

              {blockForm.blockType === 'recurring' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('my_calendar.labels.start_date')}</label>
                    <input
                      type="date"
                      value={blockForm.startDate}
                      onChange={(e) => setBlockForm({ ...blockForm, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('my_calendar.labels.start_hour')}</label>
                      <select
                        value={blockForm.startHour}
                        onChange={(e) => setBlockForm({ ...blockForm, startHour: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        {Array.from({ length: 16 }, (_, i) => i + 7).map((hour) => (
                          <option key={hour} value={hour}>
                            {hour}:00
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('my_calendar.labels.end_hour')}</label>
                      <select
                        value={blockForm.endHour}
                        onChange={(e) => setBlockForm({ ...blockForm, endHour: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                    <label className="block text-sm font-medium mb-2">{t('my_calendar.labels.frequency')}</label>
                    <select
                      value={blockForm.frequency}
                      onChange={(e) => setBlockForm({ ...blockForm, frequency: e.target.value as 'daily' | 'weekly' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="daily">{t('my_calendar.frequency.daily')}</option>
                      <option value="weekly">{t('my_calendar.frequency.weekly')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">{t('my_calendar.labels.until_optional')}</label>
                    <input
                      type="date"
                      value={blockForm.until}
                      onChange={(e) => setBlockForm({ ...blockForm, until: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('my_calendar.hints.until_default')}
                    </p>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">{t('my_calendar.labels.reason_optional')}</label>
                <input
                  type="text"
                  value={blockForm.blockReason}
                  onChange={(e) => setBlockForm({ ...blockForm, blockReason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder={t('my_calendar.placeholders.reason')}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowBlockModal(false)}
                  className="flex-1"
                >
                  {t('my_calendar.actions.cancel')}
                </Button>
                <Button onClick={handleBlockTime} className="flex-1">
                  {blockForm.blockType === 'multi-day'
                    ? t('my_calendar.actions.block_multiple_days')
                    : blockForm.blockType === 'recurring'
                    ? t('my_calendar.actions.create_recurring_blocks')
                    : t('my_calendar.actions.block_time')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {showEventDetails && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {selectedEvent.type === 'blocked' ? t('my_calendar.event_details.blocked_time') : t('my_calendar.event_details.session_details')}
              </h2>
              <button
                onClick={() => setShowEventDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">{t('my_calendar.event_details.time')}:</p>
                <p className="font-medium">
                  {formatStudioTime(selectedEvent.startTime, 'PPP')}
                </p>
                <p className="text-sm text-gray-600">
                  {formatStudioTime(selectedEvent.startTime, 'p')} - {formatStudioTime(selectedEvent.endTime, 'p')}
                </p>
              </div>

              {selectedEvent.type !== 'blocked' && (
                <>
                  <div>
                    <p className="text-sm text-gray-600">{t('my_calendar.event_details.customer')}:</p>
                    <p className="font-medium">{selectedEvent.customerId?.userId?.name || t('my_calendar.unknown')}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">{t('my_calendar.event_details.type')}:</p>
                    <p className="font-medium capitalize">{selectedEvent.type}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">{t('my_calendar.event_details.status')}:</p>
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
                  <p className="text-sm text-gray-600">{t('my_calendar.event_details.notes')}:</p>
                  <p className="text-sm">{selectedEvent.notes}</p>
                </div>
              )}

              {/* Only allow unblocking own blocked time */}
              {selectedEvent.type === 'blocked' &&
               selectedEvent.teacherId?._id === currentTeacherId && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => handleUnblock(selectedEvent._id)}
                    className="w-full border-red-300 text-red-600 hover:bg-red-50"
                  >
                    {t('my_calendar.actions.unblock_this_time')}
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-6">
              <Button variant="outline" onClick={() => setShowEventDetails(false)} className="w-full">
                {t('my_calendar.actions.close')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Toaster position="top-right" />
    </div>
  );
}
