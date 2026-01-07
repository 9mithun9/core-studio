'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatStudioTime } from '@/lib/date';
import toast, { Toaster } from 'react-hot-toast';

export default function AdminPackageRequests() {
  const { t } = useTranslation('admin');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all' | 'approved' | 'rejected'>('pending');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showCustomerInfo, setShowCustomerInfo] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<any>(null);
  const [approvalForm, setApprovalForm] = useState({
    packageType: 'private',
    sessions: 10,
    price: 10000,
    activationDate: '',
  });

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      let endpoint = '/package-requests/requests';

      if (filter === 'pending') {
        endpoint = '/package-requests/requests/pending';
      } else if (filter === 'approved' || filter === 'rejected') {
        endpoint = `/package-requests/requests?status=${filter}`;
      }

      const data: any = await apiClient.get(endpoint);
      setRequests(data.requests || []);
    } catch (err: any) {
      console.error('Failed to load requests', err);
    } finally {
      setLoading(false);
    }
  };

  const openApproveModal = (request: any) => {
    setSelectedRequest(request);
    // Pre-fill with customer's requested values
    const requestDate = new Date(request.requestedAt || Date.now());
    setApprovalForm({
      packageType: request.packageType,
      sessions: request.sessions,
      price: calculatePrice(request.packageType, request.sessions),
      activationDate: requestDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
    });
    setShowApproveModal(true);
  };

  const fetchCustomerDetails = async (customerId: string) => {
    try {
      const data: any = await apiClient.get(`/admin/customers-sessions`);
      const customer = data.customers.find((c: any) => c._id === customerId);
      setCustomerDetails(customer);
      setShowCustomerInfo(true);
    } catch (err) {
      console.error('Failed to fetch customer details', err);
    }
  };

  const calculatePrice = (type: string, sessions: number) => {
    const pricePerSession: Record<string, number> = {
      private: 1000,
      duo: 800,
      group: 600,
    };
    return (pricePerSession[type] || 1000) * sessions;
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    const loadingToast = toast.loading('Creating package...');

    try {
      await apiClient.post(`/package-requests/requests/${selectedRequest._id}/approve`, {
        packageType: approvalForm.packageType,
        sessions: approvalForm.sessions,
        price: approvalForm.price,
        activationDate: approvalForm.activationDate,
      });
      toast.success('Package request approved! Package created for customer.', {
        id: loadingToast,
        duration: 4000,
      });
      setShowApproveModal(false);
      setSelectedRequest(null);
      loadRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to approve request', {
        id: loadingToast,
      });
    }
  };

  const handleReject = async (requestId: string) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;

    const loadingToast = toast.loading('Rejecting request...');

    try {
      await apiClient.post(`/package-requests/requests/${requestId}/reject`, { reason });
      toast.success('Package request rejected', {
        id: loadingToast,
        duration: 3000,
      });
      loadRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reject request', {
        id: loadingToast,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/30 backdrop-blur-md rounded-3xl shadow-2xl border border-white/40 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.packageRequests')}</h1>
            <p className="text-gray-600 mt-2">Manage customer package renewal requests</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filter === 'pending' ? 'default' : 'outline'}
              onClick={() => setFilter('pending')}
              className={filter === 'pending' ? 'bg-gradient-to-r from-orange-400 to-pink-400 hover:from-orange-500 hover:to-pink-500' : 'border-gray-300 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50'}
            >
              {t('registrations.pending')}
            </Button>
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'bg-gradient-to-r from-orange-400 to-pink-400 hover:from-orange-500 hover:to-pink-500' : 'border-gray-300 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50'}
            >
              {t('registrations.allRequests')}
            </Button>
            <Button
              variant={filter === 'approved' ? 'default' : 'outline'}
              onClick={() => setFilter('approved')}
              className={filter === 'approved' ? 'bg-gradient-to-r from-orange-400 to-pink-400 hover:from-orange-500 hover:to-pink-500' : 'border-gray-300 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50'}
            >
              {t('registrations.approved')}
            </Button>
            <Button
              variant={filter === 'rejected' ? 'default' : 'outline'}
              onClick={() => setFilter('rejected')}
              className={filter === 'rejected' ? 'bg-gradient-to-r from-orange-400 to-pink-400 hover:from-orange-500 hover:to-pink-500' : 'border-gray-300 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50'}
            >
              {t('registrations.rejected')}
            </Button>
          </div>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white/30 backdrop-blur-md rounded-3xl shadow-2xl border border-white/40 overflow-hidden">
          <div className="py-16 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-orange-100 to-pink-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">{filter === 'pending' ? t('registrations.noPending') : t('registrations.noRequests')}</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <div key={request._id} className="bg-white/30 backdrop-blur-md rounded-3xl shadow-xl border border-white/40 overflow-hidden hover:shadow-2xl transition-all">
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                  <div className="flex-1">
                    {request.customerId ? (
                      <>
                        <button
                          onClick={() => fetchCustomerDetails(request.customerId._id)}
                          className="text-xl font-bold text-orange-600 hover:text-orange-700 hover:underline text-left transition-colors"
                        >
                          {request.customerId?.userId?.name || 'Unknown Customer'}
                        </button>
                        <p className="text-sm text-gray-600 mt-1">
                          {request.customerId?.userId?.email}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Click name to view customer profile
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="text-xl font-bold text-gray-400">
                          Deleted Customer
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Customer account no longer exists</p>
                      </>
                    )}
                  </div>
                  <span
                    className={`inline-flex px-4 py-2 rounded-full text-sm font-semibold shadow-lg ${
                      request.status === 'pending'
                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white'
                        : request.status === 'approved'
                        ? 'bg-gradient-to-r from-green-400 to-green-500 text-white'
                        : 'bg-gradient-to-r from-red-400 to-red-500 text-white'
                    }`}
                  >
                    {request.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-white/60">
                    <div className="text-xs text-gray-600 mb-1 font-medium">Package Type</div>
                    <div className="font-bold text-gray-900 capitalize">{request.packageType}</div>
                  </div>
                  <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-white/60">
                    <div className="text-xs text-gray-600 mb-1 font-medium">Sessions</div>
                    <div className="font-bold text-gray-900">{request.sessions} Sessions</div>
                  </div>
                  <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-white/60">
                    <div className="text-xs text-gray-600 mb-1 font-medium">Requested</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {formatStudioTime(request.requestedAt, 'MMM d, yyyy')}
                    </div>
                  </div>
                  {request.reviewedAt && (
                    <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-white/60">
                      <div className="text-xs text-gray-600 mb-1 font-medium">Reviewed</div>
                      <div className="text-sm font-semibold text-gray-900">
                        {formatStudioTime(request.reviewedAt, 'MMM d, yyyy')}
                      </div>
                    </div>
                  )}
                </div>

                {request.notes && (
                  <div className="mb-6 p-4 bg-white/40 backdrop-blur-sm rounded-2xl border border-white/60">
                    <div className="text-xs text-gray-600 mb-2 font-semibold flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      Customer Notes
                    </div>
                    <div className="text-sm text-gray-800">{request.notes}</div>
                  </div>
                )}

                {request.rejectionReason && (
                  <div className="mb-6 p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border-2 border-red-200">
                    <div className="text-xs text-red-700 mb-2 font-bold flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Rejection Reason
                    </div>
                    <div className="text-sm text-red-900">{request.rejectionReason}</div>
                  </div>
                )}

                {request.reviewedBy && (
                  <div className="text-xs text-gray-600 mb-4 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Reviewed by: <span className="font-semibold">{request.reviewedBy?.name || 'Admin'}</span>
                  </div>
                )}

                {request.status === 'pending' && (
                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    {request.customerId ? (
                      <>
                        <Button
                          onClick={() => openApproveModal(request)}
                          className="flex-1 bg-gradient-to-r from-orange-400 to-pink-400 hover:from-orange-500 hover:to-pink-500 shadow-lg hover:shadow-xl transition-all"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {t('registrations.approve')} & {t('registrations.createPackage')}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleReject(request._id)}
                          className="flex-1 border-2 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {t('registrations.reject')}
                        </Button>
                      </>
                    ) : (
                      <div className="text-sm text-gray-600 italic p-4 bg-white/40 backdrop-blur-sm rounded-2xl border border-white/60 flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Cannot approve/reject - customer account deleted
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve Package Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
          <div className="bg-white/30 backdrop-blur-md rounded-3xl shadow-2xl border border-white/40 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Review & Approve Package Request</h2>
              <button
                onClick={() => setShowApproveModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white/50 rounded-full transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Customer Info */}
            <div className="mb-6 p-4 bg-gradient-to-br from-orange-50 to-pink-50 rounded-2xl border-2 border-orange-200">
              <div className="text-sm text-orange-800 font-semibold mb-2">Customer</div>
              <div className="text-lg font-bold text-gray-900">{selectedRequest.customerId?.userId?.name}</div>
              <div className="text-sm text-gray-700">{selectedRequest.customerId?.userId?.email}</div>
            </div>

            {/* Customer's Request */}
            <div className="mb-6 p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/60">
              <div className="text-sm text-gray-700 font-semibold mb-3">Customer Requested:</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white/50 p-3 rounded-xl">
                  <div className="text-xs text-gray-600 mb-1">Type</div>
                  <div className="font-bold capitalize text-gray-900">{selectedRequest.packageType}</div>
                </div>
                <div className="bg-white/50 p-3 rounded-xl">
                  <div className="text-xs text-gray-600 mb-1">Sessions</div>
                  <div className="font-bold text-gray-900">{selectedRequest.sessions}</div>
                </div>
              </div>
              {selectedRequest.notes && (
                <div className="mt-3 text-sm text-gray-700 bg-white/50 p-3 rounded-xl">
                  <span className="font-semibold">Notes:</span> <span className="italic">{selectedRequest.notes}</span>
                </div>
              )}
            </div>

            {/* Edit Package Details */}
            <div className="space-y-4">
              <div className="text-sm font-bold text-gray-900 mb-3">Edit Package Details:</div>

              {/* Package Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  {t('registrations.packageType')}
                </label>
                <select
                  value={approvalForm.packageType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setApprovalForm({
                      ...approvalForm,
                      packageType: newType,
                      price: calculatePrice(newType, approvalForm.sessions)
                    });
                  }}
                  className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                >
                  <option value="private">{t('registrations.private')}</option>
                  <option value="duo">{t('registrations.duo')}</option>
                  <option value="group">{t('registrations.group')}</option>
                </select>
              </div>

              {/* Number of Sessions */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  {t('registrations.sessions')}
                </label>
                <select
                  value={approvalForm.sessions}
                  onChange={(e) => {
                    const newSessions = parseInt(e.target.value);
                    setApprovalForm({
                      ...approvalForm,
                      sessions: newSessions,
                      price: calculatePrice(approvalForm.packageType, newSessions)
                    });
                  }}
                  className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                >
                  <option value={1}>1 {t('registrations.session')}</option>
                  <option value={5}>5 {t('registrations.sessions')}</option>
                  <option value={10}>10 {t('registrations.sessions')}</option>
                  <option value={20}>20 {t('registrations.sessions')}</option>
                  <option value={30}>30 {t('registrations.sessions')}</option>
                </select>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  {t('registrations.priceTHB')}
                </label>
                <input
                  type="number"
                  value={approvalForm.price}
                  onChange={(e) => setApprovalForm({ ...approvalForm, price: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                  placeholder="Enter price"
                  min="0"
                />
              </div>

              {/* Activation Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Activation Date
                </label>
                <input
                  type="date"
                  value={approvalForm.activationDate}
                  onChange={(e) => setApprovalForm({ ...approvalForm, activationDate: e.target.value })}
                  className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                />
                <div className="text-xs text-gray-600 mt-2 flex items-start gap-1">
                  <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Package will be valid for 1 year from this date (defaults to request date)
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border-2 border-green-200">
                <div className="text-sm text-green-800 font-bold mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Package Summary:
                </div>
                <div className="text-sm text-gray-900">
                  <div className="capitalize font-semibold">{approvalForm.packageType} - {approvalForm.sessions} Sessions</div>
                  <div className="text-2xl font-bold text-green-900 mt-2">฿{approvalForm.price.toLocaleString()}</div>
                  <div className="text-xs text-green-700 mt-2">Valid for 1 year from approval date</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowApproveModal(false)}
                  className="flex-1 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleApprove}
                  className="flex-1 bg-gradient-to-r from-orange-400 to-pink-400 hover:from-orange-500 hover:to-pink-500 shadow-lg hover:shadow-xl transition-all"
                >
                  {t('registrations.approve')} & {t('registrations.createPackage')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Info Modal */}
      {showCustomerInfo && customerDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
          <div className="bg-white/30 backdrop-blur-md rounded-3xl shadow-2xl border border-white/40 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Customer Profile</h2>
              <button
                onClick={() => setShowCustomerInfo(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-white/50 rounded-full transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Basic Info */}
              <div className="space-y-4">
                <div className="bg-white/40 backdrop-blur-sm rounded-2xl border border-white/60 overflow-hidden">
                  <div className="bg-gradient-to-r from-orange-400 to-pink-400 px-4 py-3">
                    <h3 className="font-bold text-white">Personal Information</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="text-xs text-gray-600 font-semibold mb-1">Name</div>
                      <div className="font-bold text-gray-900">{customerDetails.userId?.name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 font-semibold mb-1">Email</div>
                      <div className="font-semibold text-gray-900">{customerDetails.userId?.email}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 font-semibold mb-1">Phone</div>
                      <div className="font-semibold text-gray-900">{customerDetails.userId?.phone || 'N/A'}</div>
                    </div>
                    {customerDetails.dateOfBirth && (
                      <div>
                        <div className="text-xs text-gray-600 font-semibold mb-1">Date of Birth</div>
                        <div className="font-semibold text-gray-900">{formatStudioTime(customerDetails.dateOfBirth, 'PPP')}</div>
                      </div>
                    )}
                    {customerDetails.profession && (
                      <div>
                        <div className="text-xs text-gray-600 font-semibold mb-1">Profession</div>
                        <div className="font-semibold text-gray-900">{customerDetails.profession}</div>
                      </div>
                    )}
                    {customerDetails.height && customerDetails.weight && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs text-gray-600 font-semibold mb-1">Height</div>
                          <div className="font-bold text-gray-900">{customerDetails.height} cm</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 font-semibold mb-1">Weight</div>
                          <div className="font-bold text-gray-900">{customerDetails.weight} kg</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {customerDetails.medicalNotes && (
                  <div className="bg-white/40 backdrop-blur-sm rounded-2xl border-2 border-red-300 overflow-hidden">
                    <div className="bg-gradient-to-r from-red-400 to-red-500 px-4 py-3">
                      <h3 className="font-bold text-white flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Medical Notes
                      </h3>
                    </div>
                    <div className="p-4">
                      <div className="text-sm bg-red-50 p-3 rounded-xl text-red-900">{customerDetails.medicalNotes}</div>
                    </div>
                  </div>
                )}

                {(customerDetails.emergencyContactName || customerDetails.emergencyContactPhone) && (
                  <div className="bg-white/40 backdrop-blur-sm rounded-2xl border border-white/60 overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-400 to-pink-400 px-4 py-3">
                      <h3 className="font-bold text-white">Emergency Contact</h3>
                    </div>
                    <div className="p-4 space-y-2">
                      {customerDetails.emergencyContactName && (
                        <div>
                          <div className="text-xs text-gray-600 font-semibold mb-1">Name</div>
                          <div className="font-bold text-gray-900">{customerDetails.emergencyContactName}</div>
                        </div>
                      )}
                      {customerDetails.emergencyContactPhone && (
                        <div>
                          <div className="text-xs text-gray-600 font-semibold mb-1">Phone</div>
                          <div className="font-bold text-gray-900">{customerDetails.emergencyContactPhone}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Stats & Packages */}
              <div className="space-y-4">
                <div className="bg-white/40 backdrop-blur-sm rounded-2xl border border-white/60 overflow-hidden">
                  <div className="bg-gradient-to-r from-orange-400 to-pink-400 px-4 py-3">
                    <h3 className="font-bold text-white">Statistics</h3>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200">
                        <div className="text-3xl font-bold text-blue-600">{customerDetails.totalSessions}</div>
                        <div className="text-xs text-gray-700 font-semibold mt-1">Total</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border-2 border-green-200">
                        <div className="text-3xl font-bold text-green-600">{customerDetails.completedSessions}</div>
                        <div className="text-xs text-gray-700 font-semibold mt-1">Completed</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl border-2 border-orange-200">
                        <div className="text-3xl font-bold text-orange-600">{customerDetails.upcomingSessions}</div>
                        <div className="text-xs text-gray-700 font-semibold mt-1">Upcoming</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/40 backdrop-blur-sm rounded-2xl border border-white/60 overflow-hidden">
                  <div className="bg-gradient-to-r from-orange-400 to-pink-400 px-4 py-3">
                    <h3 className="font-bold text-white">Packages</h3>
                  </div>
                  <div className="p-4">
                    {customerDetails.packages && customerDetails.packages.length > 0 ? (
                      <div className="space-y-3">
                        {customerDetails.packages.map((pkg: any) => (
                          <div key={pkg._id} className="p-4 bg-white/50 backdrop-blur-sm border-2 border-white/60 rounded-2xl hover:shadow-lg transition-all">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-bold text-sm text-gray-900">{pkg.name}</div>
                                <div className="text-xs text-gray-600 capitalize font-semibold mt-1">{pkg.type}</div>
                                <div className="text-xs mt-2 font-semibold text-gray-700">
                                  {pkg.remainingSessions}/{pkg.totalSessions} sessions left
                                </div>
                              </div>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
                                  pkg.status === 'active'
                                    ? 'bg-gradient-to-r from-green-400 to-green-500 text-white'
                                    : pkg.status === 'expired'
                                    ? 'bg-gradient-to-r from-red-400 to-red-500 text-white'
                                    : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                                }`}
                              >
                                {pkg.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-600 py-8">
                        <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        No packages
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => setShowCustomerInfo(false)}
                className="bg-gradient-to-r from-orange-400 to-pink-400 hover:from-orange-500 hover:to-pink-500 shadow-lg hover:shadow-xl transition-all"
              >
                {t('common.close')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Toaster position="top-right" />
    </div>
  );
}
