'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminCalendarIntegration() {
  const { t } = useTranslation('admin');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectionData, setConnectionData] = useState<any>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const response: any = await apiClient.get('/calendars/connection');
      setConnected(response.connected);
      setConnectionData(response.connection);
    } catch (error) {
      console.error('Error checking calendar connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const response: any = await apiClient.get('/calendars/auth-url');
      // Redirect to Google OAuth
      window.location.href = response.authUrl;
    } catch (error) {
      console.error('Error getting auth URL:', error);
      alert('Failed to connect to Google Calendar');
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect the studio Google Calendar? This will affect all teachers and customers.')) {
      return;
    }

    try {
      await apiClient.delete('/calendars/disconnect');
      setConnected(false);
      setConnectionData(null);
      alert('Google Calendar disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      alert('Failed to disconnect Google Calendar');
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8">{t('common.loading')}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Studio Calendar Integration</h1>

      <Card>
        <CardHeader>
          <CardTitle>Connect Studio's Google Calendar</CardTitle>
          <CardDescription>
            Connect your studio's Google Calendar to automatically block time slots for all teachers based on your calendar events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {connected ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-green-700 font-medium">Studio Calendar Connected</span>
              </div>

              {connectionData && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Calendar ID:</span> {connectionData.calendarId}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">Connected on:</span>{' '}
                    {new Date(connectionData.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">How it works:</h3>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Any event in your Google Calendar automatically blocks that time for ALL teachers</li>
                    <li>Customers see blocked times when booking sessions</li>
                    <li>Confirmed bookings are automatically added to your Google Calendar</li>
                    <li>This is a studio-wide calendar shared by all teachers and visible to all customers</li>
                  </ul>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-medium text-amber-900 mb-2">Example Usage:</h3>
                  <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                    <li>Create "Studio Closed" event → All slots blocked for that day</li>
                    <li>Create "Personal Time" event → That specific time blocked</li>
                    <li>Create "Staff Meeting" event → That time blocked for all teachers</li>
                    <li>Holidays, maintenance, etc. can all be managed from your Google Calendar</li>
                  </ul>
                </div>

                <Button onClick={handleDisconnect} variant="outline" className="w-full">
                  Disconnect Studio Calendar
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <h3 className="font-medium mb-3">Benefits of connecting the studio calendar:</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-primary-600">✓</span>
                    <span>
                      <strong>Central management:</strong> Manage studio availability from one Google Calendar
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-600">✓</span>
                    <span>
                      <strong>Studio-wide blocking:</strong> Block time for ALL teachers at once (holidays, closures, etc.)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-600">✓</span>
                    <span>
                      <strong>Automatic sync:</strong> Confirmed bookings added to your calendar
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-600">✓</span>
                    <span>
                      <strong>Everyone sees it:</strong> Teachers, customers, and staff all see blocked times
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-600">✓</span>
                    <span>
                      <strong>Easy to manage:</strong> Just create events in Google Calendar - no need to update the system
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-yellow-900 mb-2">Important:</h3>
                <p className="text-sm text-yellow-800">
                  Only connect the Google account that you use for managing studio schedules.
                  Any event in that calendar will block booking slots for all teachers.
                </p>
              </div>

              <Button onClick={handleConnect} className="w-full" size="lg">
                Connect Studio Google Calendar
              </Button>

              <p className="text-xs text-gray-500 text-center mt-4">
                We only access your calendar availability (busy/free times) and create events for
                confirmed bookings. Your calendar data is secure and private.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
