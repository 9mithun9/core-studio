'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/apiClient';
import toast, { Toaster } from 'react-hot-toast';

export default function PackagesPage() {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({ packageType: 'private', sessions: 10, notes: '' });

  const packages = [
    {
      title: 'Single Session',
      sessions: 1,
      price: 1500,
      description: 'Perfect for trying out Pilates or occasional practice',
      features: ['1 private session', 'Flexible scheduling', 'Expert instruction'],
    },
    {
      title: 'Starter Package',
      sessions: 5,
      price: 7000,
      description: 'Great for beginners starting their Pilates journey',
      features: ['5 private sessions', 'Valid for 2 months', 'Personalized program'],
      popular: true,
    },
    {
      title: 'Standard Package',
      sessions: 10,
      price: 13000,
      description: 'Most popular choice for regular practitioners',
      features: ['10 private sessions', 'Valid for 3 months', 'Progress tracking'],
      popular: true,
    },
    {
      title: 'Premium Package',
      sessions: 20,
      price: 24000,
      description: 'Best value for committed practitioners',
      features: ['20 private sessions', 'Valid for 6 months', 'Priority booking'],
    },
  ];

  const handleRequestPackage = async () => {
    const loadingToast = toast.loading('Submitting package request...');

    try {
      await apiClient.post('/package-requests/request', requestForm);
      toast.success('Package request submitted successfully! Waiting for admin approval.', {
        id: loadingToast,
        duration: 4000,
      });
      setShowRequestModal(false);
      setRequestForm({ packageType: 'private', sessions: 10, notes: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit request', {
        id: loadingToast,
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Our Packages</h1>
        <p className="text-gray-600">
          Choose the perfect package for your Pilates journey. All packages include one-on-one sessions
          with our expert instructors.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {packages.map((pkg, index) => (
          <Card
            key={index}
            className={`relative ${pkg.popular ? 'border-primary-500 border-2 shadow-lg' : ''}`}
          >
            {pkg.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                  POPULAR
                </span>
              </div>
            )}
            <CardHeader className="text-center">
              <CardTitle className="text-xl mb-2">{pkg.title}</CardTitle>
              <div className="mb-2">
                <span className="text-4xl font-bold text-primary-600">{pkg.sessions}</span>
                <span className="text-gray-600 ml-2">sessions</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                ฿{pkg.price.toLocaleString()}
              </div>
              <CardDescription className="mt-2">{pkg.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {pkg.features.map((feature, i) => (
                  <li key={i} className="flex items-start">
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
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Ready to Start or Renew Your Package?
              </h3>
              <p className="text-gray-600">
                Click the button to request a new package or renew your existing one. Our team will contact
                you to complete the purchase.
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => setShowRequestModal(true)}
              className="whitespace-nowrap"
            >
              Add/Renew Package
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Package Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Request Package</h2>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-gray-400 hover:text-gray-600"
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
                  Package Type
                </label>
                <select
                  value={requestForm.packageType}
                  onChange={(e) => setRequestForm({ ...requestForm, packageType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="private">Private</option>
                  <option value="duo">Duo</option>
                  <option value="group">Group</option>
                </select>
              </div>

              {/* Number of Sessions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Sessions
                </label>
                <select
                  value={requestForm.sessions}
                  onChange={(e) => setRequestForm({ ...requestForm, sessions: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value={10}>10 Sessions</option>
                  <option value={20}>20 Sessions</option>
                  <option value={30}>30 Sessions</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={requestForm.notes}
                  onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                  placeholder="Any special requests or comments..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRequestPackage}
                  className="flex-1"
                >
                  Submit Request
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
