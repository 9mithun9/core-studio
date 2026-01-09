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
  const [mobileStartDay, setMobileStartDay] = useState(selectedDate || new Date());

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // For mobile: show 3 consecutive days starting from mobileStartDay
  const mobileDays = Array.from({ length: 3 }, (_, i) => addDays(mobileStartDay, i));

  const getEventsForSlot = (date: Date, hour: number) => {
    return events.filter((event) => {
      const eventStart = new Date(event.startTime);
      const eventHour = eventStart.getHours();
      return isSameDay(eventStart, date) && eventHour === hour;
    });
  };

  const getEventColor = (event: CalendarEvent) => {
    // Blocked time - Executive gray with subtle gradient
    if (event.type === 'blocked') {
      return 'bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600 text-white border-0 shadow-md';
    }

    // Session type colors with gradients (when not showing teacher colors)
    if (!showTeacherColors) {
      if (event.type === 'private') return 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 text-white border-0 shadow-md';
      if (event.type === 'duo') return 'bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600 text-white border-0 shadow-md';
      if (event.type === 'group') return 'bg-gradient-to-br from-green-500 via-green-600 to-emerald-700 text-white border-0 shadow-md';
    }

    return 'bg-gradient-to-br from-gray-300 to-gray-400 text-white border-0 shadow-md';
  };

  const getTeacherColorStyle = (event: CalendarEvent) => {
    // Always apply teacher colors if teacherColorMap has entries and event has a teacher
    if (!event.teacherId || teacherColorMap.size === 0) return {};

    const teacherId = typeof event.teacherId === 'object' ? (event.teacherId as any)._id : event.teacherId;
    const color = event.teacherColor || teacherColorMap.get(teacherId);

    if (color) {
      return {
        background: `linear-gradient(135deg, ${color}dd 0%, ${color}ff 100%)`,
        borderColor: 'transparent',
        borderWidth: '0px',
        color: '#ffffff',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
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
    setMobileStartDay(selectedDate);
  };

  const handleMobileNavigate = (direction: 'prev' | 'next') => {
    const daysToAdd = direction === 'next' ? 3 : -3;
    setMobileStartDay(addDays(mobileStartDay, daysToAdd));
  };

  return (
    <div className="w-full">
      {/* Week Navigation - Desktop */}
      <div className="hidden md:flex items-center justify-between mb-4 gap-3">
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

      {/* Week Navigation - Mobile (with swipe buttons) */}
      <div className="flex md:hidden items-center justify-between mb-4 gap-2">
        <button
          onClick={() => handleMobileNavigate('prev')}
          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
          aria-label="Previous 3 days"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 text-center">
          <div className="text-sm font-semibold">
            {format(mobileDays[0], 'MMM d')} - {format(mobileDays[2], 'MMM d, yyyy')}
          </div>
        </div>
        <button
          onClick={() => handleMobileNavigate('next')}
          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
          aria-label="Next 3 days"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Mobile Date Picker */}
      <div className="flex md:hidden justify-center mb-4">
        <input
          type="date"
          onChange={handleDateSelect}
          value={format(mobileStartDay, 'yyyy-MM-dd')}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
          title="Jump to date"
        />
      </div>

      {/* Calendar Grid - Desktop (7 days) */}
      <div className="hidden md:block border rounded-lg overflow-hidden bg-white/30 backdrop-blur-md border-white/40">
        {/* Header Row */}
        <div className="grid grid-cols-8 border-b bg-white/20">
          <div className="p-2 text-center text-sm font-medium text-gray-700">Time</div>
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={`p-2 text-center border-l ${
                isSameDay(day, new Date()) ? 'bg-orange-100/60 font-bold' : ''
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
              <div className="p-2 text-xs text-gray-700 text-center border-r bg-white/10">
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
                    className={`border-l p-1 relative ${isToday ? 'bg-orange-50/40' : ''} ${
                      isDisabled
                        ? 'bg-gray-200/30 cursor-not-allowed'
                        : 'hover:bg-white/20 cursor-pointer'
                    } transition-colors`}
                    onClick={() => !isDisabled && onSlotClick && onSlotClick(day, hour)}
                    title={isDisabled ? 'Sessions must be booked at least 24 hours in advance' : ''}
                  >
                    {slotEvents.map((event) => (
                      <div
                        key={event._id}
                        className={`relative text-xs p-2 rounded-lg mb-1 ${getEventColor(event)} hover:shadow-xl hover:scale-105 transition-all duration-200 cursor-pointer overflow-hidden`}
                        style={getTeacherColorStyle(event)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick && onEventClick(event);
                        }}
                      >
                        {/* Animated shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer"></div>

                        <div className="relative z-10">
                          <div className="font-bold truncate drop-shadow-sm">
                            {event.type === 'blocked'
                              ? '🔒 Blocked'
                              : event.customerId?.userId?.name || 'Unknown'}
                          </div>
                          <div className="text-[10px] opacity-90 capitalize truncate mt-0.5">
                            {format(new Date(event.startTime), 'h:mm a')} • {event.type}
                          </div>
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

      {/* Calendar Grid - Mobile (3 days, fits on screen) */}
      <div className="md:hidden border rounded-lg overflow-hidden bg-white/30 backdrop-blur-md border-white/40">
        {/* Header Row */}
        <div className="grid grid-cols-4 border-b bg-white/20">
          <div className="p-2 text-center text-xs font-medium text-gray-700">Time</div>
          {mobileDays.map((day) => (
            <div
              key={day.toISOString()}
              className={`p-2 text-center border-l ${
                isSameDay(day, new Date()) ? 'bg-orange-100/60 font-bold' : ''
              }`}
            >
              <div className="text-xs text-gray-600">{format(day, 'EEE')}</div>
              <div className="text-xs font-semibold">{format(day, 'd')}</div>
            </div>
          ))}
        </div>

        {/* Time Slots */}
        <div className="divide-y max-h-[600px] overflow-y-auto">
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-4 min-h-[70px]">
              {/* Hour Label */}
              <div className="p-1 text-xs text-gray-700 text-center border-r bg-white/10">
                {format(set(new Date(), { hours: hour, minutes: 0 }), 'h a')}
              </div>

              {/* Day Slots */}
              {mobileDays.map((day) => {
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
                    className={`border-l p-1 relative ${isToday ? 'bg-orange-50/40' : ''} ${
                      isDisabled
                        ? 'bg-gray-200/30 cursor-not-allowed'
                        : 'hover:bg-white/20 cursor-pointer'
                    } transition-colors`}
                    onClick={() => !isDisabled && onSlotClick && onSlotClick(day, hour)}
                    title={isDisabled ? 'Sessions must be booked at least 24 hours in advance' : ''}
                  >
                    {slotEvents.map((event) => (
                      <div
                        key={event._id}
                        className={`relative text-[10px] p-1 rounded-lg mb-1 ${getEventColor(event)} hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer overflow-hidden`}
                        style={getTeacherColorStyle(event)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick && onEventClick(event);
                        }}
                      >
                        {/* Animated shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full"></div>

                        <div className="relative z-10">
                          <div className="font-bold truncate drop-shadow-sm">
                            {event.type === 'blocked'
                              ? '🔒'
                              : event.customerId?.userId?.name?.split(' ')[0] || 'Unknown'}
                          </div>
                          <div className="text-[9px] opacity-90 truncate">
                            {format(new Date(event.startTime), 'h:mm a')}
                          </div>
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
    </div>
  );
}
