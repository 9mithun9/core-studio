'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
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
    <div className="space-y-12">
        {/* Type Selector Pills */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 p-2 bg-white/30 backdrop-blur-md rounded-full shadow-lg border border-white/40">
            <button
              onClick={() => setSelectedType('private')}
              className={`px-6 py-3 rounded-full font-semibold transition-all ${
                selectedType === 'private'
                  ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('packages.private')}
            </button>
            <button
              onClick={() => setSelectedType('duo')}
              className={`px-6 py-3 rounded-full font-semibold transition-all ${
                selectedType === 'duo'
                  ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('packages.duo')}
            </button>
            <button
              onClick={() => setSelectedType('group')}
              className={`px-6 py-3 rounded-full font-semibold transition-all ${
                selectedType === 'group'
                  ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md'
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
                className={`relative bg-white/20 backdrop-blur-xl rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-white/30 ${
                  isPopular ? 'ring-2 ring-orange-400 transform scale-105' : ''
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
                    <div className="inline-flex items-baseline gap-2 px-4 py-2 bg-gradient-to-r from-orange-100 to-pink-100 rounded-full">
                      <span className="text-3xl font-extrabold text-orange-600">
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
                        ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600 shadow-md hover:shadow-lg'
                        : 'bg-white/40 backdrop-blur-sm text-gray-800 hover:bg-white/60 border border-white/50'
                    }`}
                  >
                    {t('packages.requestModal.title')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      {/* Package Request Modal */}
      {showRequestModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
          <div className="bg-white/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 w-full max-w-lg overflow-hidden transform transition-all">
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-orange-500 to-pink-500 px-6 md:px-8 py-6 md:py-8 relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full -ml-12 -mb-12"></div>
              </div>

              <div className="flex items-center justify-between relative z-10">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-1">{t('packages.requestModal.title')}</h2>
                  <p className="text-white/90 text-sm">Choose your perfect package</p>
                </div>
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 md:px-8 py-6 md:py-8 space-y-6 bg-white/10 backdrop-blur-md">
              {/* Package Type Selection */}
              <div>
                <label className="block text-sm font-semibold text-white mb-3">
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
                          ? 'border-orange-400 bg-gradient-to-br from-orange-400/30 to-pink-400/30 backdrop-blur-md text-white shadow-lg ring-2 ring-orange-400'
                          : 'border-white/40 bg-white/20 backdrop-blur-sm hover:border-orange-300 text-white/90 hover:bg-white/30'
                      }`}
                    >
                      <div className="capitalize">{t(`packages.${type}`)}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of Sessions */}
              <div>
                <label className="block text-sm font-semibold text-white mb-3">
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
                          ? 'border-orange-400 bg-gradient-to-br from-orange-400/30 to-pink-400/30 backdrop-blur-md shadow-lg ring-2 ring-orange-400'
                          : 'border-white/40 bg-white/20 backdrop-blur-sm hover:border-orange-300 hover:bg-white/30'
                      }`}
                    >
                      <div className={`text-2xl font-bold mb-1 ${requestForm.sessions === count ? 'text-white' : 'text-white/90'}`}>
                        {count}
                      </div>
                      <div className={`text-xs ${requestForm.sessions === count ? 'text-white' : 'text-white/80'}`}>
                        {count === 1 ? 'session' : 'sessions'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-white mb-3">
                  {t('packages.requestModal.notesLabel')}
                </label>
                <textarea
                  value={requestForm.notes}
                  onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                  placeholder={t('packages.requestModal.notesPlaceholder')}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-white/40 bg-white/20 backdrop-blur-sm rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all resize-none text-base text-white placeholder-white/60"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 py-6 text-base font-semibold border-2 border-white/50 bg-white/20 backdrop-blur-sm hover:border-white/70 hover:bg-white/30 text-white rounded-xl"
                >
                  {t('packages.requestModal.cancel')}
                </Button>
                <Button
                  onClick={handleRequestPackage}
                  className="flex-1 py-6 text-base font-semibold bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 rounded-xl shadow-lg hover:shadow-xl transition-all text-white"
                >
                  {t('packages.requestModal.submit')}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <Toaster position="top-right" />
    </div>
  );
}
