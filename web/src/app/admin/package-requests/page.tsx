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
    return <div className="text-center py-12">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('dashboard.packageRequests')}</h1>
          <p className="text-gray-600 mt-2">Manage customer package renewal requests</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
          >
            {t('registrations.pending')}
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            {t('registrations.allRequests')}
          </Button>
          <Button
            variant={filter === 'approved' ? 'default' : 'outline'}
            onClick={() => setFilter('approved')}
          >
            {t('registrations.approved')}
          </Button>
          <Button
            variant={filter === 'rejected' ? 'default' : 'outline'}
            onClick={() => setFilter('rejected')}
          >
            {t('registrations.rejected')}
          </Button>
        </div>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p>{filter === 'pending' ? t('registrations.noPending') : t('registrations.noRequests')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    {request.customerId ? (
                      <>
                        <button
                          onClick={() => fetchCustomerDetails(request.customerId._id)}
                          className="text-lg font-bold text-blue-600 hover:text-blue-800 hover:underline text-left"
                        >
                          {request.customerId?.userId?.name || 'Unknown Customer'}
                        </button>
                        <p className="text-sm text-gray-600 mt-1">
                          {request.customerId?.userId?.email}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Click name to view customer profile</p>
                      </>
                    ) : (
                      <>
                        <div className="text-lg font-bold text-gray-400">
                          Deleted Customer
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Customer account no longer exists</p>
                      </>
                    )}
                  </div>
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Package Type</div>
                    <div className="font-semibold capitalize">{request.packageType}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Sessions</div>
                    <div className="font-semibold">{request.sessions} Sessions</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Requested</div>
                    <div className="text-sm">
                      {formatStudioTime(request.requestedAt, 'MMM d, yyyy')}
                    </div>
                  </div>
                  {request.reviewedAt && (
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Reviewed</div>
                      <div className="text-sm">
                        {formatStudioTime(request.reviewedAt, 'MMM d, yyyy')}
                      </div>
                    </div>
                  )}
                </div>

                {request.notes && (
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <div className="text-xs text-gray-600 mb-1">Customer Notes</div>
                    <div className="text-sm">{request.notes}</div>
                  </div>
                )}

                {request.rejectionReason && (
                  <div className="mb-4 p-3 bg-red-50 rounded">
                    <div className="text-xs text-red-600 mb-1">Rejection Reason</div>
                    <div className="text-sm text-red-800">{request.rejectionReason}</div>
                  </div>
                )}

                {request.reviewedBy && (
                  <div className="text-xs text-gray-600 mb-4">
                    Reviewed by: {request.reviewedBy?.name || 'Admin'}
                  </div>
                )}

                {request.status === 'pending' && (
                  <div className="flex gap-3 mt-4">
                    {request.customerId ? (
                      <>
                        <Button
                          onClick={() => openApproveModal(request)}
                          className="flex-1"
                        >
                          {t('registrations.approve')} & {t('registrations.createPackage')}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleReject(request._id)}
                          className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                        >
                          {t('registrations.reject')}
                        </Button>
                      </>
                    ) : (
                      <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded">
                        Cannot approve/reject - customer account deleted
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approve Package Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Review & Approve Package Request</h2>
              <button
                onClick={() => setShowApproveModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Customer Info */}
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-800 font-semibold mb-1">Customer</div>
              <div className="text-lg font-bold">{selectedRequest.customerId?.userId?.name}</div>
              <div className="text-sm text-gray-600">{selectedRequest.customerId?.userId?.email}</div>
            </div>

            {/* Customer's Request */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-2">Customer Requested:</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Type: <span className="font-semibold capitalize">{selectedRequest.packageType}</span></div>
                <div>Sessions: <span className="font-semibold">{selectedRequest.sessions}</span></div>
              </div>
              {selectedRequest.notes && (
                <div className="mt-2 text-sm text-gray-600">
                  Notes: <span className="italic">{selectedRequest.notes}</span>
                </div>
              )}
            </div>

            {/* Edit Package Details */}
            <div className="space-y-4">
              <div className="text-sm font-semibold text-gray-700 mb-2">Edit Package Details:</div>

              {/* Package Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="private">{t('registrations.private')}</option>
                  <option value="duo">{t('registrations.duo')}</option>
                  <option value="group">{t('registrations.group')}</option>
                </select>
              </div>

              {/* Number of Sessions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('registrations.priceTHB')}
                </label>
                <input
                  type="number"
                  value={approvalForm.price}
                  onChange={(e) => setApprovalForm({ ...approvalForm, price: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter price"
                  min="0"
                />
              </div>

              {/* Activation Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activation Date
                </label>
                <input
                  type="date"
                  value={approvalForm.activationDate}
                  onChange={(e) => setApprovalForm({ ...approvalForm, activationDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Package will be valid for 1 year from this date (defaults to request date)
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-green-800 font-semibold mb-2">Package Summary:</div>
                <div className="text-sm">
                  <div className="capitalize">{approvalForm.packageType} - {approvalForm.sessions} Sessions</div>
                  <div className="text-lg font-bold text-green-900 mt-1">฿{approvalForm.price.toLocaleString()}</div>
                  <div className="text-xs text-green-700 mt-1">Valid for 1 year from approval date</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowApproveModal(false)}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleApprove}
                  className="flex-1"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Customer Profile</h2>
              <button
                onClick={() => setShowCustomerInfo(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Basic Info */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="text-xs text-gray-600">Name</div>
                      <div className="font-semibold">{customerDetails.userId?.name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Email</div>
                      <div className="font-semibold">{customerDetails.userId?.email}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Phone</div>
                      <div className="font-semibold">{customerDetails.userId?.phone || 'N/A'}</div>
                    </div>
                    {customerDetails.dateOfBirth && (
                      <div>
                        <div className="text-xs text-gray-600">Date of Birth</div>
                        <div className="font-semibold">{formatStudioTime(customerDetails.dateOfBirth, 'PPP')}</div>
                      </div>
                    )}
                    {customerDetails.profession && (
                      <div>
                        <div className="text-xs text-gray-600">Profession</div>
                        <div className="font-semibold">{customerDetails.profession}</div>
                      </div>
                    )}
                    {customerDetails.height && customerDetails.weight && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs text-gray-600">Height</div>
                          <div className="font-semibold">{customerDetails.height} cm</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600">Weight</div>
                          <div className="font-semibold">{customerDetails.weight} kg</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {customerDetails.medicalNotes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-red-600">Medical Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm bg-red-50 p-3 rounded">{customerDetails.medicalNotes}</div>
                    </CardContent>
                  </Card>
                )}

                {(customerDetails.emergencyContactName || customerDetails.emergencyContactPhone) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Emergency Contact</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {customerDetails.emergencyContactName && (
                        <div>
                          <div className="text-xs text-gray-600">Name</div>
                          <div className="font-semibold">{customerDetails.emergencyContactName}</div>
                        </div>
                      )}
                      {customerDetails.emergencyContactPhone && (
                        <div>
                          <div className="text-xs text-gray-600">Phone</div>
                          <div className="font-semibold">{customerDetails.emergencyContactPhone}</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column - Stats & Packages */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded">
                        <div className="text-2xl font-bold text-blue-600">{customerDetails.totalSessions}</div>
                        <div className="text-xs text-gray-600">Total</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded">
                        <div className="text-2xl font-bold text-green-600">{customerDetails.completedSessions}</div>
                        <div className="text-xs text-gray-600">Completed</div>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded">
                        <div className="text-2xl font-bold text-orange-600">{customerDetails.upcomingSessions}</div>
                        <div className="text-xs text-gray-600">Upcoming</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Packages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {customerDetails.packages && customerDetails.packages.length > 0 ? (
                      <div className="space-y-2">
                        {customerDetails.packages.map((pkg: any) => (
                          <div key={pkg._id} className="p-3 border rounded">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-semibold text-sm">{pkg.name}</div>
                                <div className="text-xs text-gray-600 capitalize">{pkg.type}</div>
                                <div className="text-xs mt-1">
                                  {pkg.remainingSessions}/{pkg.totalSessions} sessions left
                                </div>
                              </div>
                              <span
                                className={`px-2 py-1 rounded text-xs ${
                                  pkg.status === 'active'
                                    ? 'bg-green-100 text-green-800'
                                    : pkg.status === 'expired'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {pkg.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-4">No packages</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setShowCustomerInfo(false)}>{t('common.close')}</Button>
            </div>
          </div>
        </div>
      )}

      <Toaster position="top-right" />
    </div>
  );
}
