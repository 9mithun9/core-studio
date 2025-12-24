'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/apiClient';
import toast, { Toaster } from 'react-hot-toast';

export default function PackagesPage() {
  const { t } = useTranslation('customer');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({ packageType: 'private', sessions: 10, notes: '' });
  const [selectedTabs, setSelectedTabs] = useState<Record<string, 'private' | 'duo' | 'group'>>({
    single: 'private',
    starter: 'private',
    standard: 'private',
    premium: 'private',
    ultimate: 'private',
  });

  const packages = [
    {
      key: 'single',
      sessions: 1,
      pricing: {
        private: 1500,
        duo: 1200,
        group: 800,
      },
    },
    {
      key: 'starter',
      sessions: 5,
      pricing: {
        private: 7000,
        duo: 5500,
        group: 3500,
      },
      popular: true,
    },
    {
      key: 'standard',
      sessions: 10,
      pricing: {
        private: 13000,
        duo: 10000,
        group: 6500,
      },
      popular: true,
    },
    {
      key: 'premium',
      sessions: 20,
      pricing: {
        private: 24000,
        duo: 18000,
        group: 12000,
      },
    },
    {
      key: 'ultimate',
      sessions: 30,
      pricing: {
        private: 34000,
        duo: 25000,
        group: 16500,
      },
    },
  ];

  const handleRequestPackage = async () => {
    const loadingToast = toast.loading(t('packages.requestModal.submitting'));

    try {
      await apiClient.post('/package-requests/request', requestForm);
      toast.success(t('packages.requestModal.success'), {
        id: loadingToast,
        duration: 4000,
      });
      setShowRequestModal(false);
      setRequestForm({ packageType: 'private', sessions: 10, notes: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('packages.requestModal.failed'), {
        id: loadingToast,
      });
    }
  };

  const handleTabChange = (packageKey: string, tab: 'private' | 'duo' | 'group') => {
    setSelectedTabs(prev => ({ ...prev, [packageKey]: tab }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          {t('packages.title')}
        </h1>
        <p className="text-sm md:text-base text-gray-600">
          {t('packages.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6 mb-6 md:mb-8">
        {packages.map((pkg) => (
          <Card
            key={pkg.key}
            className={`relative ${pkg.popular ? 'border-primary-500 border-2 shadow-lg' : ''}`}
          >
            {pkg.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                  {t('packages.popular')}
                </span>
              </div>
            )}
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-lg md:text-xl mb-2">
                {t(`packages.catalog.${pkg.key}.title`)}
              </CardTitle>
              <div className="mb-2">
                <span className="text-3xl md:text-4xl font-bold text-primary-600">
                  {pkg.sessions}
                </span>
                <span className="text-gray-600 ml-2 text-sm md:text-base">
                  {t('packages.sessions')}
                </span>
              </div>

              {/* Tabs for Private/Duo/Group */}
              <div className="flex border-b border-gray-200 mb-3">
                <button
                  onClick={() => handleTabChange(pkg.key, 'private')}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    selectedTabs[pkg.key] === 'private'
                      ? 'border-b-2 border-primary-600 text-primary-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('packages.private')}
                </button>
                <button
                  onClick={() => handleTabChange(pkg.key, 'duo')}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    selectedTabs[pkg.key] === 'duo'
                      ? 'border-b-2 border-primary-600 text-primary-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('packages.duo')}
                </button>
                <button
                  onClick={() => handleTabChange(pkg.key, 'group')}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    selectedTabs[pkg.key] === 'group'
                      ? 'border-b-2 border-primary-600 text-primary-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('packages.group')}
                </button>
              </div>

              {/* Price for selected tab */}
              <div className="text-2xl md:text-3xl font-bold text-gray-900">
                ฿{pkg.pricing[selectedTabs[pkg.key]].toLocaleString()}
              </div>
              <CardDescription className="mt-2 text-xs md:text-sm">
                {t(`packages.catalog.${pkg.key}.description`)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {['feature1', 'feature2', 'feature3'].map((feature) => (
                  <li key={feature} className="flex items-start">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-xs md:text-sm text-gray-600">
                      {t(`packages.catalog.${pkg.key}.features.${feature}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
                {t('packages.cta.title')}
              </h3>
              <p className="text-sm md:text-base text-gray-600">
                {t('packages.cta.description')}
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => setShowRequestModal(true)}
              className="w-full md:w-auto whitespace-nowrap"
            >
              {t('packages.cta.button')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Package Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold">
                {t('packages.requestModal.title')}
              </h2>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Package Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('packages.requestModal.packageTypeLabel')}
                </label>
                <select
                  value={requestForm.packageType}
                  onChange={(e) => setRequestForm({ ...requestForm, packageType: e.target.value })}
                  className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="private">{t('packages.private')}</option>
                  <option value="duo">{t('packages.duo')}</option>
                  <option value="group">{t('packages.group')}</option>
                </select>
              </div>

              {/* Number of Sessions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('packages.requestModal.sessionsLabel')}
                </label>
                <select
                  value={requestForm.sessions}
                  onChange={(e) => setRequestForm({ ...requestForm, sessions: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value={10}>{t('packages.requestModal.sessions10')}</option>
                  <option value={20}>{t('packages.requestModal.sessions20')}</option>
                  <option value={30}>{t('packages.requestModal.sessions30')}</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('packages.requestModal.notesLabel')}
                </label>
                <textarea
                  value={requestForm.notes}
                  onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                  placeholder={t('packages.requestModal.notesPlaceholder')}
                  rows={3}
                  className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1"
                >
                  {t('packages.requestModal.cancel')}
                </Button>
                <Button
                  onClick={handleRequestPackage}
                  className="flex-1"
                >
                  {t('packages.requestModal.submit')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toaster position="top-right" />
    </div>
  );
}
