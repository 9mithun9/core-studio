'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TeacherCalendarIntegration() {
  const { t } = useTranslation('teacher');
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
    return <div className="container mx-auto px-4 py-6 md:py-8">{t('common.loading')}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-4xl">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8">{t('calendar.title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">{t('calendar.connect_title')}</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {t('calendar.connect_description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6">
          {connected ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-green-700 font-medium text-xs md:text-sm">{t('calendar.connected')}</span>
              </div>

              {connectionData && (
                <div className="bg-gray-50 p-3 md:p-4 rounded-lg mb-4">
                  <p className="text-xs md:text-sm text-gray-600">
                    <span className="font-medium">{t('calendar.calendar_id')}:</span> {connectionData.calendarId}
                  </p>
                  <p className="text-xs md:text-sm text-gray-600 mt-1">
                    <span className="font-medium">{t('calendar.connected_on')}:</span>{' '}
                    {new Date(connectionData.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div className="space-y-3 md:space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4">
                  <h3 className="font-medium text-blue-900 mb-2 text-sm md:text-base">{t('calendar.how_it_works')}:</h3>
                  <ul className="text-xs md:text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>{t('calendar.auto_block')}</li>
                    <li>{t('calendar.students_see_blocked')}</li>
                    <li>{t('calendar.confirmed_added')}</li>
                  </ul>
                </div>

                <Button onClick={handleDisconnect} variant="outline" className="w-full" size="sm">
                  <span className="text-xs md:text-sm">{t('calendar.disconnect')}</span>
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="bg-gray-50 p-4 md:p-6 rounded-lg mb-4 md:mb-6">
                <h3 className="font-medium mb-3 text-sm md:text-base">{t('calendar.benefits_title')}:</h3>
                <ul className="space-y-2 text-xs md:text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-primary-600">✓</span>
                    <span>
                      <strong>{t('calendar.benefit_auto_blocking')}:</strong> {t('calendar.benefit_auto_blocking_desc')}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-600">✓</span>
                    <span>
                      <strong>{t('calendar.benefit_two_way')}:</strong> {t('calendar.benefit_two_way_desc')}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-600">✓</span>
                    <span>
                      <strong>{t('calendar.benefit_prevent_double')}:</strong> {t('calendar.benefit_prevent_double_desc')}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-600">✓</span>
                    <span>
                      <strong>{t('calendar.benefit_seamless')}:</strong> {t('calendar.benefit_seamless_desc')}
                    </span>
                  </li>
                </ul>
              </div>

              <Button onClick={handleConnect} className="w-full" size="sm">
                <span className="text-xs md:text-sm">{t('calendar.connect_button')}</span>
              </Button>

              <p className="text-xs text-gray-500 text-center mt-4">
                {t('calendar.privacy_note')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
