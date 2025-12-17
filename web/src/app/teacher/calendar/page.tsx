'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TeacherCalendarIntegration() {
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
    if (!confirm('Are you sure you want to disconnect your Google Calendar?')) {
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
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Google Calendar Integration</h1>

      <Card>
        <CardHeader>
          <CardTitle>Connect Your Google Calendar</CardTitle>
          <CardDescription>
            Sync your schedule with Google Calendar to automatically block time slots when you have
            other appointments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {connected ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-green-700 font-medium">Connected</span>
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
                    <li>Your Google Calendar events automatically block time slots</li>
                    <li>Students see blocked times when booking sessions</li>
                    <li>Confirmed bookings from this system are added to your Google Calendar</li>
                  </ul>
                </div>

                <Button onClick={handleDisconnect} variant="outline" className="w-full">
                  Disconnect Google Calendar
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <h3 className="font-medium mb-3">Benefits of connecting:</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-primary-600">✓</span>
                    <span>
                      <strong>Automatic blocking:</strong> Your Google Calendar events automatically
                      block booking slots
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-600">✓</span>
                    <span>
                      <strong>Two-way sync:</strong> Confirmed bookings are added to your Google
                      Calendar
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-600">✓</span>
                    <span>
                      <strong>Prevent double bookings:</strong> Students can't book times when you're
                      busy
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-600">✓</span>
                    <span>
                      <strong>Seamless integration:</strong> All your appointments in one place
                    </span>
                  </li>
                </ul>
              </div>

              <Button onClick={handleConnect} className="w-full" size="lg">
                Connect Google Calendar
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
