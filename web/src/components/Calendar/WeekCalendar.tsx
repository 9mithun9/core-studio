'use client';

import { useState } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, set } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface CalendarEvent {
  _id: string;
  startTime: string;
  endTime: string;
  type: 'private' | 'duo' | 'group' | 'blocked';
  status: string;
  customerId?: {
    userId: {
      name: string;
      email: string;
    };
  };
  teacherId?: {
    userId: {
      name: string;
      email: string;
    };
  };
  notes?: string;
  teacherColor?: string;
}

interface WeekCalendarProps {
  events: CalendarEvent[];
  onSlotClick?: (date: Date, hour: number) => void;
  onEventClick?: (event: CalendarEvent) => void;
  showTeacherColors?: boolean;
  teacherColorMap?: Map<string, string>;
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
  isCustomerView?: boolean; // If true, applies 24-hour advance booking restriction
}

const hours = Array.from({ length: 16 }, (_, i) => i + 7); // 7 AM to 10 PM (11 PM is end time)

const TEACHER_COLORS = [
  'bg-blue-100 border-blue-300 text-blue-900',
  'bg-purple-100 border-purple-300 text-purple-900',
  'bg-green-100 border-green-300 text-green-900',
  'bg-orange-100 border-orange-300 text-orange-900',
  'bg-pink-100 border-pink-300 text-pink-900',
  'bg-indigo-100 border-indigo-300 text-indigo-900',
];

export default function WeekCalendar({
  events,
  onSlotClick,
  onEventClick,
  showTeacherColors = false,
  teacherColorMap = new Map(),
  selectedDate,
  onDateChange,
  isCustomerView = false,
}: WeekCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(selectedDate || new Date(), { weekStartsOn: 1 }) // Week starts on Monday
  );

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const getEventsForSlot = (date: Date, hour: number) => {
    return events.filter((event) => {
      const eventStart = new Date(event.startTime);
      const eventHour = eventStart.getHours();
      return isSameDay(eventStart, date) && eventHour === hour;
    });
  };

  const getEventColor = (event: CalendarEvent) => {
    // Blocked time
    if (event.type === 'blocked') {
      return 'bg-gray-200 border-gray-400 text-gray-700';
    }

    // Session type colors (when not showing teacher colors)
    if (!showTeacherColors) {
      if (event.type === 'private') return 'bg-blue-100 border-blue-300 text-blue-900';
      if (event.type === 'duo') return 'bg-purple-100 border-purple-300 text-purple-900';
      if (event.type === 'group') return 'bg-green-100 border-green-300 text-green-900';
    }

    return 'bg-gray-100 border-gray-300';
  };

  const getTeacherColorStyle = (event: CalendarEvent) => {
    // Always apply teacher colors if teacherColorMap has entries and event has a teacher
    if (!event.teacherId || teacherColorMap.size === 0) return {};

    const teacherId = typeof event.teacherId === 'object' ? (event.teacherId as any)._id : event.teacherId;
    const color = event.teacherColor || teacherColorMap.get(teacherId);

    if (color) {
      return {
        backgroundColor: `${color}20`, // 20 is hex for ~12% opacity
        borderColor: color,
        borderWidth: '2px',
        color: color,
      };
    }

    return {};
  };

  const handleWeekChange = (newWeekStart: Date) => {
    setCurrentWeekStart(newWeekStart);
    if (onDateChange) {
      onDateChange(newWeekStart);
    }
  };

  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = new Date(e.target.value);
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    handleWeekChange(weekStart);
  };

  return (
    <div className="w-full">
      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <Button variant="outline" size="sm" onClick={() => handleWeekChange(subWeeks(currentWeekStart, 1))}>
          ← Previous Week
        </Button>
        <div className="flex items-center gap-3">
          <div className="text-lg font-semibold">
            {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}
          </div>
          <input
            type="date"
            onChange={handleDateSelect}
            value={format(currentWeekStart, 'yyyy-MM-dd')}
            className="px-3 py-1 text-sm border border-gray-300 rounded-lg"
            title="Jump to date"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => handleWeekChange(addWeeks(currentWeekStart, 1))}>
          Next Week →
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden bg-white">
        {/* Header Row */}
        <div className="grid grid-cols-8 border-b bg-gray-50">
          <div className="p-2 text-center text-sm font-medium text-gray-600">Time</div>
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={`p-2 text-center border-l ${
                isSameDay(day, new Date()) ? 'bg-primary-50 font-bold' : ''
              }`}
            >
              <div className="text-xs text-gray-600">{format(day, 'EEE')}</div>
              <div className="text-sm">{format(day, 'd')}</div>
            </div>
          ))}
        </div>

        {/* Time Slots */}
        <div className="divide-y">
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-8 min-h-[80px]">
              {/* Hour Label */}
              <div className="p-2 text-xs text-gray-600 text-center border-r bg-gray-50">
                {format(set(new Date(), { hours: hour, minutes: 0 }), 'h a')}
              </div>

              {/* Day Slots */}
              {weekDays.map((day) => {
                const slotEvents = getEventsForSlot(day, hour);
                const isToday = isSameDay(day, new Date());

                // Check if slot is less than 24 hours away (for customer view)
                const slotDateTime = set(day, { hours: hour, minutes: 0, seconds: 0, milliseconds: 0 });
                const now = new Date();
                const hoursDifference = (slotDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
                const isLessThan24Hours = hoursDifference < 24;
                const isPastSlot = slotDateTime < now;
                const isDisabled = isCustomerView && (isLessThan24Hours || isPastSlot);

                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={`border-l p-1 relative ${isToday ? 'bg-primary-50/30' : ''} ${
                      isDisabled
                        ? 'bg-gray-100 cursor-not-allowed'
                        : 'hover:bg-gray-50 cursor-pointer'
                    } transition-colors`}
                    onClick={() => !isDisabled && onSlotClick && onSlotClick(day, hour)}
                    title={isDisabled ? 'Sessions must be booked at least 24 hours in advance' : ''}
                  >
                    {slotEvents.map((event) => (
                      <div
                        key={event._id}
                        className={`text-xs p-2 rounded border mb-1 ${getEventColor(event)} hover:shadow-md transition-shadow cursor-pointer`}
                        style={getTeacherColorStyle(event)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick && onEventClick(event);
                        }}
                      >
                        <div className="font-semibold truncate">
                          {event.type === 'blocked'
                            ? '🔒 Blocked'
                            : event.customerId?.userId?.name || 'Unknown'}
                        </div>
                        <div className="text-xs opacity-75 capitalize truncate">
                          {format(new Date(event.startTime), 'h:mm a')} - {event.type}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
          <span>Private</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded"></div>
          <span>Duo</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
          <span>Group</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 border border-gray-400 rounded"></div>
          <span>Blocked</span>
        </div>
      </div>
    </div>
  );
}
