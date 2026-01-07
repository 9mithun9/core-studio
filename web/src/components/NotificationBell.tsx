'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/lib/apiClient';
import { formatStudioTime } from '@/lib/date';
import { authService } from '@/lib/auth';
import '@/lib/i18n';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  titleKey?: string;
  messageKey?: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
  relatedId?: string;
  relatedModel?: 'Booking' | 'Package' | 'PackageRequest' | 'RegistrationRequest';
}

export default function NotificationBell() {
  const { t } = useTranslation('common');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response: any = await apiClient.get('/notifications');
      setNotifications(response?.notifications || []);
      setUnreadCount(response?.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Load notifications on mount and every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get navigation path based on notification type
  const getNavigationPath = (notification: Notification): string | null => {
    if (!notification.relatedId) return null;

    const user = authService.getStoredUser();
    const userRole = user?.role;

    switch (notification.type) {
      case 'registration_requested':
      case 'registration_approved':
      case 'registration_rejected':
        return '/admin/registrations';

      case 'package_requested':
      case 'package_approved':
      case 'package_rejected':
        return '/admin/package-requests';

      case 'booking_requested':
      case 'booking_approved':
      case 'booking_rejected':
      case 'booking_cancelled':
      case 'cancellation_requested':
        // Route teachers to their session requests page
        if (userRole === 'teacher') {
          return '/teacher/session-requests';
        }
        return '/admin/bookings';

      default:
        return null;
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }

    // Navigate to related page
    const path = getNavigationPath(notification);
    if (path) {
      setShowDropdown(false);
      router.push(path);
    }
  };

  // Mark as read
  const markAsRead = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent navigation when deleting
    try {
      await apiClient.delete(`/notifications/${id}`);
      setNotifications(notifications.filter(n => n._id !== id));
      const deletedNotification = notifications.find(n => n._id === id);
      if (deletedNotification && !deletedNotification.isRead) {
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  // Mark as read without navigating
  const markAsReadOnly = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent navigation when just marking as read
    await markAsRead(id);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2.5 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        {/* Bell SVG Icon */}
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold leading-none text-white bg-gradient-to-r from-red-500 to-red-600 rounded-full shadow-lg">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-[9999] max-h-[600px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-orange-600 to-pink-600">
            <h3 className="text-lg font-bold text-white">{t('notifications.title')}</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-white hover:text-orange-100 font-medium underline decoration-2 underline-offset-2 transition-colors"
              >
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block w-8 h-8 border-3 border-orange-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-sm text-gray-500">{t('notifications.loading')}</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-orange-100 to-pink-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-orange-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-600">{t('notifications.noNotifications')}</p>
                <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`px-5 py-4 border-b border-gray-100 hover:bg-orange-50 transition-all cursor-pointer group ${
                    !notification.isRead ? 'bg-gradient-to-r from-orange-50 to-pink-50' : 'bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1.5">
                        <h4 className="font-semibold text-gray-900 text-sm leading-tight pr-2">
                          {notification.titleKey ? t(notification.titleKey) : notification.title}
                        </h4>
                        {!notification.isRead && (
                          <span className="w-2.5 h-2.5 bg-gradient-to-r from-orange-600 to-pink-600 rounded-full flex-shrink-0 mt-1 shadow-sm"></span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2 leading-relaxed">
                        {notification.messageKey ? t(notification.messageKey, notification.data || {}) as string : notification.message}
                      </p>
                      <div className="flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs text-gray-500 font-medium">
                          {formatStudioTime(new Date(notification.createdAt))}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.isRead && (
                        <button
                          onClick={(e) => markAsReadOnly(notification._id, e)}
                          className="p-1.5 text-orange-600 hover:bg-orange-100 rounded-md transition-colors"
                          title={t('notifications.markAsRead')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={(e) => deleteNotification(notification._id, e)}
                        className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                        title={t('notifications.delete')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
