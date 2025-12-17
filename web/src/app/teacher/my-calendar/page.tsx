'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import WeekCalendar from '@/components/Calendar/WeekCalendar';
import toast, { Toaster } from 'react-hot-toast';
import { formatStudioTime } from '@/lib/date';
import { addDays, startOfWeek, endOfWeek, set } from 'date-fns';
import { createTeacherColorMap } from '@/lib/teacherColors';

export default function TeacherMyCalendar() {
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
      toast.error('Failed to load calendar');
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
    const loadingToast = toast.loading('Blocking time...');

    try {
      if (blockForm.blockType === 'multi-day') {
        // Multi-day blocking: Block entire days from start to end date
        const startDate = new Date(blockForm.startDate);
        const endDate = new Date(blockForm.endDate);
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff < 0) {
          toast.error('End date must be after start date', { id: loadingToast });
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
            blockReason: blockForm.blockReason || 'Holiday/Time off',
          };
          promises.push(apiClient.post('/bookings/block', payload));
        }

        await Promise.all(promises);
        toast.success(`Blocked time for ${daysDiff + 1} day(s) successfully!`, {
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
          blockReason: blockForm.blockReason || 'Time blocked',
          recurring: {
            enabled: true,
            frequency: blockForm.frequency,
            until: blockForm.until ? new Date(blockForm.until).toISOString() : undefined,
          },
        };

        await apiClient.post('/bookings/block', payload);
        toast.success('Recurring time blocks created successfully!', {
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
          blockReason: blockForm.blockReason || 'Time blocked',
        };

        await apiClient.post('/bookings/block', payload);
        toast.success('Time blocked successfully!', {
          id: loadingToast,
          duration: 3000,
        });
      }

      setShowBlockModal(false);
      setSelectedSlot(null);
      await loadEvents(teachers, currentTeacherId);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to block time', {
        id: loadingToast,
      });
    }
  };

  const handleUnblock = async (eventId: string) => {
    if (!confirm('Are you sure you want to unblock this time?')) return;

    const loadingToast = toast.loading('Unblocking time...');

    try {
      await apiClient.delete(`/bookings/block/${eventId}`);

      toast.success('Time unblocked successfully!', {
        id: loadingToast,
        duration: 3000,
      });

      setShowEventDetails(false);
      setSelectedEvent(null);
      await loadEvents(teachers, currentTeacherId);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to unblock time', {
        id: loadingToast,
      });
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading calendar...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Calendar</h1>
          <p className="text-gray-600 mt-2">View schedules and block time slots</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setSelectedSlot({ date: new Date(), hour: 9 });
              setShowBlockModal(true);
            }}
          >
            Block Time
          </Button>
        </div>
      </div>

      {/* Teacher Filter */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">View Schedule:</label>
        <select
          value={selectedTeacher}
          onChange={(e) => setSelectedTeacher(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="me">My Schedule Only</option>
          <option value="all">All Teachers</option>
        </select>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
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
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">Teachers</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {teachers.map((teacher) => (
                <div key={teacher._id} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: teacherColorMap.get(teacher._id) }}
                  ></div>
                  <span className="text-sm">{teacher.userId?.name || 'Unknown'}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Block Time Modal */}
      {showBlockModal && selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Block Time</h2>
              <button
                onClick={() => setShowBlockModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Block Type</label>
                <select
                  value={blockForm.blockType}
                  onChange={(e) => setBlockForm({ ...blockForm, blockType: e.target.value as 'single' | 'multi-day' | 'recurring' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="single">Single Time Slot</option>
                  <option value="multi-day">Multiple Days (e.g., Holiday)</option>
                  <option value="recurring">Recurring Block</option>
                </select>
              </div>

              {blockForm.blockType === 'single' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Date</label>
                    <input
                      type="date"
                      value={blockForm.startDate}
                      onChange={(e) => setBlockForm({ ...blockForm, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">Start Hour</label>
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
                      <label className="block text-sm font-medium mb-2">End Hour</label>
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
                      <label className="block text-sm font-medium mb-2">Start Date</label>
                      <input
                        type="date"
                        value={blockForm.startDate}
                        onChange={(e) => setBlockForm({ ...blockForm, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">End Date</label>
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
                      <label className="block text-sm font-medium mb-2">Daily Start Hour</label>
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
                      <label className="block text-sm font-medium mb-2">Daily End Hour</label>
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
                    This will block the selected hours for each day in the date range
                  </p>
                </>
              )}

              {blockForm.blockType === 'recurring' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Start Date</label>
                    <input
                      type="date"
                      value={blockForm.startDate}
                      onChange={(e) => setBlockForm({ ...blockForm, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">Start Hour</label>
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
                      <label className="block text-sm font-medium mb-2">End Hour</label>
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
                    <label className="block text-sm font-medium mb-2">Frequency</label>
                    <select
                      value={blockForm.frequency}
                      onChange={(e) => setBlockForm({ ...blockForm, frequency: e.target.value as 'daily' | 'weekly' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Until (Optional)</label>
                    <input
                      type="date"
                      value={blockForm.until}
                      onChange={(e) => setBlockForm({ ...blockForm, until: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty to block for 90 days
                    </p>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">Reason (Optional)</label>
                <input
                  type="text"
                  value={blockForm.blockReason}
                  onChange={(e) => setBlockForm({ ...blockForm, blockReason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., Holiday, Meeting, Personal"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowBlockModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={handleBlockTime} className="flex-1">
                  {blockForm.blockType === 'multi-day'
                    ? 'Block Multiple Days'
                    : blockForm.blockType === 'recurring'
                    ? 'Create Recurring Blocks'
                    : 'Block Time'}
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
                {selectedEvent.type === 'blocked' ? 'Blocked Time' : 'Session Details'}
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
                <p className="text-sm text-gray-600">Time:</p>
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
                    <p className="text-sm text-gray-600">Customer:</p>
                    <p className="font-medium">{selectedEvent.customerId?.userId?.name || 'Unknown'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Type:</p>
                    <p className="font-medium capitalize">{selectedEvent.type}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Status:</p>
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
                  <p className="text-sm text-gray-600">Notes:</p>
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
                    Unblock This Time
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-6">
              <Button variant="outline" onClick={() => setShowEventDetails(false)} className="w-full">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <Toaster position="top-right" />
    </div>
  );
}
