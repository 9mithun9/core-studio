'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/apiClient';
import toast, { Toaster } from 'react-hot-toast';

export default function PackagesPage() {
  const { t } = useTranslation('customer');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({ packageType: 'private', sessions: 10, notes: '' });
  const [selectedType, setSelectedType] = useState<'private' | 'duo' | 'group'>('private');

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Type Selector Pills */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 p-2 bg-white rounded-full shadow-lg">
            <button
              onClick={() => setSelectedType('private')}
              className={`px-6 py-3 rounded-full font-semibold transition-all ${
                selectedType === 'private'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('packages.private')}
            </button>
            <button
              onClick={() => setSelectedType('duo')}
              className={`px-6 py-3 rounded-full font-semibold transition-all ${
                selectedType === 'duo'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('packages.duo')}
            </button>
            <button
              onClick={() => setSelectedType('group')}
              className={`px-6 py-3 rounded-full font-semibold transition-all ${
                selectedType === 'group'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('packages.group')}
            </button>
          </div>
        </div>

        {/* Package Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-16">
          {packages.map((pkg) => {
            const isPopular = pkg.popular;
            const price = pkg.pricing[selectedType];
            const pricePerSession = Math.round(price / pkg.sessions);

            return (
              <div
                key={pkg.key}
                className={`relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden ${
                  isPopular ? 'ring-2 ring-purple-500 transform scale-105' : ''
                }`}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute top-0 left-0 right-0 z-10">
                    <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 text-center py-1.5">
                      <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Most Popular
                      </span>
                    </div>
                  </div>
                )}

                <div className={`p-8 ${isPopular ? 'pt-12' : ''}`}>
                  {/* Package Name */}
                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {t(`packages.catalog.${pkg.key}.title`)}
                    </h3>
                    <div className="inline-flex items-baseline gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-full">
                      <span className="text-3xl font-extrabold text-purple-600">
                        {pkg.sessions}
                      </span>
                      <span className="text-sm font-medium text-gray-600">
                        {pkg.sessions === 1 ? t('packages.session') : t('packages.sessions')}
                      </span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-center mb-6">
                    <div className="text-4xl font-extrabold text-gray-900 mb-1">
                      ฿{price.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      ฿{pricePerSession.toLocaleString()} / session
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 text-center mb-6">
                    {t(`packages.catalog.${pkg.key}.description`)}
                  </p>

                  {/* Features */}
                  <ul className="space-y-3 mb-6">
                    {['feature1', 'feature2', 'feature3'].map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm text-gray-700">
                          {t(`packages.catalog.${pkg.key}.features.${feature}`)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Request Button */}
                  <button
                    onClick={() => {
                      setRequestForm({ ...requestForm, packageType: selectedType, sessions: pkg.sessions });
                      setShowRequestModal(true);
                    }}
                    className={`w-full py-3 rounded-xl font-semibold transition-all ${
                      isPopular
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-md hover:shadow-lg'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {t('packages.requestModal.title')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Package Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all">
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 md:px-8 py-6 md:py-8 relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full -ml-12 -mb-12"></div>
              </div>

              <div className="flex items-center justify-between relative z-10">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">{t('packages.requestModal.title')}</h2>
                  <p className="text-purple-100 text-sm">Choose your perfect package</p>
                </div>
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 md:px-8 py-6 md:py-8 space-y-6">
              {/* Package Type Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  {t('packages.requestModal.packageTypeLabel')}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['private', 'duo', 'group'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setRequestForm({ ...requestForm, packageType: type })}
                      className={`px-4 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
                        requestForm.packageType === type
                          ? 'border-purple-600 bg-gradient-to-br from-purple-50 to-indigo-50 text-purple-700 shadow-md'
                          : 'border-gray-200 hover:border-purple-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="capitalize">{t(`packages.${type}`)}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of Sessions */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  {t('packages.requestModal.sessionsLabel')}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[1, 5, 10, 20, 30].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setRequestForm({ ...requestForm, sessions: count })}
                      className={`px-4 py-4 rounded-xl border-2 font-medium transition-all ${
                        requestForm.sessions === count
                          ? 'border-purple-600 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-md'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`text-2xl font-bold mb-1 ${requestForm.sessions === count ? 'text-purple-700' : 'text-gray-900'}`}>
                        {count}
                      </div>
                      <div className={`text-xs ${requestForm.sessions === count ? 'text-purple-600' : 'text-gray-500'}`}>
                        {count === 1 ? 'session' : 'sessions'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  {t('packages.requestModal.notesLabel')}
                </label>
                <textarea
                  value={requestForm.notes}
                  onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                  placeholder={t('packages.requestModal.notesPlaceholder')}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all resize-none text-base"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 py-6 text-base font-semibold border-2 border-gray-300 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl"
                >
                  {t('packages.requestModal.cancel')}
                </Button>
                <Button
                  onClick={handleRequestPackage}
                  className="flex-1 py-6 text-base font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl shadow-lg hover:shadow-xl transition-all"
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
