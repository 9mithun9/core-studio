'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { apiClient } from '@/lib/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatStudioTime } from '@/lib/date';

interface RegistrationRequest {
  _id: string;
  name: string;
  email: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: {
    name: string;
    email: string;
  };
  rejectionReason?: string;
}

export default function AdminRegistrationsPage() {
  const { t } = useTranslation('admin');
  const [pendingRequests, setPendingRequests] = useState<RegistrationRequest[]>([]);
  const [allRequests, setAllRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [approvingRequest, setApprovingRequest] = useState<string | null>(null);
  const [packageForm, setPackageForm] = useState({
    packageName: '10 Session Package',
    packageType: 'private' as 'private' | 'duo' | 'group',
    totalSessions: 10,
    validityMonths: 3,
    price: 10000,
  });

  // Package options based on seed data
  const packageOptions = [
    { name: '10 Session Package', sessions: 10, price: 10000 },
    { name: '20 Session Package', sessions: 20, price: 20000 },
    { name: '30 Session Package', sessions: 30, price: 30000 },
  ];

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const [pendingData, allData]: any[] = await Promise.all([
        apiClient.get('/admin/registration-requests/pending'),
        apiClient.get('/admin/registration-requests'),
      ]);

      setPendingRequests(pendingData.requests || []);
      setAllRequests(allData.requests || []);
    } catch (error) {
      console.error('Error fetching registration requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveClick = (requestId: string) => {
    setApprovingRequest(requestId);
    // Reset form
    setPackageForm({
      packageName: '10 Session Package',
      packageType: 'private',
      totalSessions: 10,
      validityMonths: 3,
      price: 10000,
    });
  };

  const handlePackageNameChange = (packageName: string) => {
    const selectedPackage = packageOptions.find(p => p.name === packageName);
    if (selectedPackage) {
      setPackageForm({
        ...packageForm,
        packageName: selectedPackage.name,
        totalSessions: selectedPackage.sessions,
        price: selectedPackage.price,
      });
    }
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!packageForm.packageName.trim()) {
      alert(t('registrations.enterPackageName'));
      return;
    }

    try {
      await apiClient.patch(`/admin/registration-requests/${approvingRequest}/approve`, packageForm);
      alert(t('registrations.approvedSuccess'));
      setApprovingRequest(null);
      fetchRequests();
    } catch (error: any) {
      alert(error.response?.data?.error || t('registrations.failedToApprove'));
    }
  };

  const handleReject = async (requestId: string) => {
    const reason = prompt(t('registrations.rejectionReason'));
    if (!reason) return;

    try {
      await apiClient.patch(`/admin/registration-requests/${requestId}/reject`, { reason });
      alert(t('registrations.rejectedSuccess'));
      fetchRequests();
    } catch (error: any) {
      alert(error.response?.data?.error || t('registrations.failedToReject'));
    }
  };

  const displayRequests = filter === 'pending' ? pendingRequests : allRequests;

  if (loading) {
    return <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="text-center text-gray-600">{t('common.loading')}</div>
    </div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t('registrations.title')}</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">
            {t('registrations.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
            size="sm"
            className="text-xs md:text-sm"
          >
            {t('registrations.pending')} ({pendingRequests.length})
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
            className="text-xs md:text-sm"
          >
            {t('registrations.allRequests')}
          </Button>
        </div>
      </div>

      {displayRequests.length === 0 ? (
        <Card>
          <CardContent className="py-8 md:py-12 text-center">
            <p className="text-sm md:text-base text-gray-500">
              {filter === 'pending' ? t('registrations.noPending') : t('registrations.noRequests')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 md:space-y-6">
          {displayRequests.map((request) => (
            <Card key={request._id}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-base md:text-lg">{request.name}</CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      {t('registrations.requestedOn')} {formatStudioTime(request.createdAt, 'PPP p')}
                    </CardDescription>
                  </div>
                  <span
                    className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium self-start ${
                      request.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : request.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {request.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="text-xs md:text-sm font-medium text-gray-600">{t('registrations.email')}</span>
                    <span className="text-xs md:text-sm break-all">{request.email}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="text-xs md:text-sm font-medium text-gray-600">{t('registrations.phone')}</span>
                    <span className="text-xs md:text-sm">{request.phone}</span>
                  </div>

                  {request.status !== 'pending' && request.reviewedAt && (
                    <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t">
                      <p className="text-xs md:text-sm text-gray-600">
                        {request.status === 'approved' ? t('registrations.approved') : t('registrations.rejected')} {t('common.date').toLowerCase()}{' '}
                        {formatStudioTime(request.reviewedAt, 'PPP p')}
                        {request.reviewedBy && ` ${t('registrations.by')} ${request.reviewedBy.name}`}
                      </p>
                      {request.rejectionReason && (
                        <p className="text-xs md:text-sm text-red-600 mt-1">
                          {t('registrations.reason')} {request.rejectionReason}
                        </p>
                      )}
                    </div>
                  )}

                  {request.status === 'pending' && (
                    <>
                      {approvingRequest === request._id ? (
                        <form onSubmit={handleApproveSubmit} className="mt-3 md:mt-4 pt-3 md:pt-4 border-t space-y-3">
                          <h4 className="font-semibold text-xs md:text-sm">{t('registrations.createPackage')}</h4>

                          <div>
                            <label className="block text-xs font-medium mb-1">{t('registrations.packageName')}</label>
                            <select
                              value={packageForm.packageName}
                              onChange={(e) => handlePackageNameChange(e.target.value)}
                              className="w-full px-2 py-1.5 md:py-2 text-xs md:text-sm border rounded"
                              required
                            >
                              {packageOptions.map((pkg) => (
                                <option key={pkg.name} value={pkg.name}>
                                  {pkg.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium mb-1">{t('registrations.packageType')}</label>
                            <select
                              value={packageForm.packageType}
                              onChange={(e) => setPackageForm({ ...packageForm, packageType: e.target.value as 'private' | 'duo' | 'group' })}
                              className="w-full px-2 py-1.5 md:py-2 text-xs md:text-sm border rounded"
                            >
                              <option value="private">{t('registrations.private')}</option>
                              <option value="duo">{t('registrations.duo')}</option>
                              <option value="group">{t('registrations.group')}</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium mb-1">{t('registrations.sessions')}</label>
                              <input
                                type="number"
                                value={packageForm.totalSessions}
                                onChange={(e) => setPackageForm({ ...packageForm, totalSessions: parseInt(e.target.value) || 0 })}
                                min="1"
                                className="w-full px-2 py-1.5 md:py-2 text-xs md:text-sm border rounded"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1">{t('registrations.validityMonths')}</label>
                              <input
                                type="number"
                                value={packageForm.validityMonths}
                                onChange={(e) => setPackageForm({ ...packageForm, validityMonths: parseInt(e.target.value) || 0 })}
                                min="1"
                                className="w-full px-2 py-1.5 md:py-2 text-xs md:text-sm border rounded"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1">{t('registrations.priceTHB')}</label>
                              <input
                                type="number"
                                value={packageForm.price}
                                onChange={(e) => setPackageForm({ ...packageForm, price: parseFloat(e.target.value) || 0 })}
                                min="0"
                                step="0.01"
                                className="w-full px-2 py-1.5 md:py-2 text-xs md:text-sm border rounded"
                                required
                              />
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button type="submit" size="sm" className="text-xs md:text-sm">
                              {t('registrations.confirmApproval')}
                            </Button>
                            <Button
                              type="button"
                              onClick={() => setApprovingRequest(null)}
                              variant="outline"
                              size="sm"
                              className="text-xs md:text-sm"
                            >
                              {t('common.cancel')}
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-2 mt-3 md:mt-4">
                          <Button
                            onClick={() => handleApproveClick(request._id)}
                            size="sm"
                            className="text-xs md:text-sm"
                          >
                            {t('registrations.approve')}
                          </Button>
                          <Button
                            onClick={() => handleReject(request._id)}
                            variant="destructive"
                            size="sm"
                            className="text-xs md:text-sm"
                          >
                            {t('registrations.reject')}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
