'use client';

import { useEffect, useState } from 'react';
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
      alert('Please enter a package name');
      return;
    }

    try {
      await apiClient.patch(`/admin/registration-requests/${approvingRequest}/approve`, packageForm);
      alert('Registration approved successfully and package created');
      setApprovingRequest(null);
      fetchRequests();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to approve registration');
    }
  };

  const handleReject = async (requestId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      await apiClient.patch(`/admin/registration-requests/${requestId}/reject`, { reason });
      alert('Registration rejected');
      fetchRequests();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to reject registration');
    }
  };

  const displayRequests = filter === 'pending' ? pendingRequests : allRequests;

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Registration Requests</h1>
          <p className="text-gray-600 mt-2">
            Review and approve new customer registrations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
          >
            Pending ({pendingRequests.length})
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All Requests
          </Button>
        </div>
      </div>

      {displayRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">
              {filter === 'pending' ? 'No pending registration requests' : 'No registration requests found'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {displayRequests.map((request) => (
            <Card key={request._id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{request.name}</CardTitle>
                    <CardDescription>
                      Requested on {formatStudioTime(request.createdAt, 'PPP p')}
                    </CardDescription>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
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
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">Email:</span>
                    <span className="text-sm">{request.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">Phone:</span>
                    <span className="text-sm">{request.phone}</span>
                  </div>

                  {request.status !== 'pending' && request.reviewedAt && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-600">
                        {request.status === 'approved' ? 'Approved' : 'Rejected'} on{' '}
                        {formatStudioTime(request.reviewedAt, 'PPP p')}
                        {request.reviewedBy && ` by ${request.reviewedBy.name}`}
                      </p>
                      {request.rejectionReason && (
                        <p className="text-sm text-red-600 mt-1">
                          Reason: {request.rejectionReason}
                        </p>
                      )}
                    </div>
                  )}

                  {request.status === 'pending' && (
                    <>
                      {approvingRequest === request._id ? (
                        <form onSubmit={handleApproveSubmit} className="mt-4 pt-4 border-t space-y-3">
                          <h4 className="font-semibold text-sm">Create Package for Customer</h4>

                          <div>
                            <label className="block text-xs font-medium mb-1">Package Name</label>
                            <select
                              value={packageForm.packageName}
                              onChange={(e) => handlePackageNameChange(e.target.value)}
                              className="w-full px-2 py-1 text-sm border rounded"
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
                            <label className="block text-xs font-medium mb-1">Package Type</label>
                            <select
                              value={packageForm.packageType}
                              onChange={(e) => setPackageForm({ ...packageForm, packageType: e.target.value as 'private' | 'duo' | 'group' })}
                              className="w-full px-2 py-1 text-sm border rounded"
                            >
                              <option value="private">Private</option>
                              <option value="duo">Duo</option>
                              <option value="group">Group</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs font-medium mb-1">Sessions</label>
                              <input
                                type="number"
                                value={packageForm.totalSessions}
                                onChange={(e) => setPackageForm({ ...packageForm, totalSessions: parseInt(e.target.value) || 0 })}
                                min="1"
                                className="w-full px-2 py-1 text-sm border rounded"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1">Validity (months)</label>
                              <input
                                type="number"
                                value={packageForm.validityMonths}
                                onChange={(e) => setPackageForm({ ...packageForm, validityMonths: parseInt(e.target.value) || 0 })}
                                min="1"
                                className="w-full px-2 py-1 text-sm border rounded"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1">Price (THB)</label>
                              <input
                                type="number"
                                value={packageForm.price}
                                onChange={(e) => setPackageForm({ ...packageForm, price: parseFloat(e.target.value) || 0 })}
                                min="0"
                                step="0.01"
                                className="w-full px-2 py-1 text-sm border rounded"
                                required
                              />
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button type="submit" size="sm">
                              Confirm Approval
                            </Button>
                            <Button
                              type="button"
                              onClick={() => setApprovingRequest(null)}
                              variant="outline"
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex gap-2 mt-4">
                          <Button
                            onClick={() => handleApproveClick(request._id)}
                            size="sm"
                          >
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleReject(request._id)}
                            variant="destructive"
                            size="sm"
                          >
                            Reject
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
