'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { formatStudioTime } from '@/lib/date';
import toast, { Toaster } from 'react-hot-toast';

export default function TeacherSessionRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all' | 'approved' | 'rejected' | 'auto-confirmed'>('pending');
  const [teacherId, setTeacherId] = useState<string>('');

  useEffect(() => {
    fetchTeacherId();
  }, []);

  useEffect(() => {
    if (teacherId) {
      loadRequests();
    }
  }, [filter, teacherId]);

  const fetchTeacherId = async () => {
    try {
      const response: any = await apiClient.get('/teachers/me');
      setTeacherId(response.teacher._id);
    } catch (err) {
      console.error('Failed to fetch teacher info', err);
      toast.error('Failed to load teacher information');
    }
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      let endpoint = `/bookings?teacherId=${teacherId}`;

      if (filter === 'pending') {
        endpoint = `/bookings?teacherId=${teacherId}&status=pending`;
      } else if (filter === 'approved') {
        endpoint = `/bookings?teacherId=${teacherId}&status=confirmed`;
      } else if (filter === 'rejected') {
        endpoint = `/bookings?teacherId=${teacherId}&status=cancelled`;
      } else if (filter === 'auto-confirmed') {
        endpoint = `/bookings?teacherId=${teacherId}&autoConfirmed=true`;
      }

      const data: any = await apiClient.get(endpoint);
      setRequests(data.bookings || []);
    } catch (err: any) {
      console.error('Failed to load requests', err);
      toast.error('Failed to load session requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    const loadingToast = toast.loading('Approving session...');

    try {
      await apiClient.patch(`/bookings/${requestId}/confirm`);
      toast.success('Session approved successfully!', {
        id: loadingToast,
        duration: 3000,
      });
      loadRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to approve session', {
        id: loadingToast,
      });
    }
  };

  const handleReject = async (requestId: string) => {
    const reason = prompt('Reason for rejection (optional):');
    if (reason === null) return; // User cancelled

    const loadingToast = toast.loading('Rejecting session...');

    try {
      await apiClient.patch(`/bookings/${requestId}/reject`, { reason: reason || 'Not available' });
      toast.success('Session rejected', {
        id: loadingToast,
        duration: 3000,
      });
      loadRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reject session', {
        id: loadingToast,
      });
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading session requests...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Session Requests</h1>
          <p className="text-gray-600 mt-2">Manage your session booking requests</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
          >
            Pending
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All Requests
          </Button>
          <Button
            variant={filter === 'approved' ? 'default' : 'outline'}
            onClick={() => setFilter('approved')}
          >
            Approved
          </Button>
          <Button
            variant={filter === 'auto-confirmed' ? 'default' : 'outline'}
            onClick={() => setFilter('auto-confirmed')}
          >
            Auto Confirmed
          </Button>
          <Button
            variant={filter === 'rejected' ? 'default' : 'outline'}
            onClick={() => setFilter('rejected')}
          >
            Rejected
          </Button>
        </div>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p>No {filter === 'pending' ? 'pending' : ''} session requests</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold">
                      {request.customerId?.userId?.name || 'Unknown Customer'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {request.customerId?.userId?.email}
                    </p>
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
                    <div className="text-xs text-gray-600 mb-1">Date & Time</div>
                    <div className="font-semibold">
                      {formatStudioTime(request.startTime, 'PPP')}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatStudioTime(request.startTime, 'p')}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Session Type</div>
                    <div className="font-semibold capitalize">{request.type}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Requested</div>
                    <div className="text-sm">
                      {formatStudioTime(request.createdAt, 'MMM d, yyyy')}
                    </div>
                  </div>
                  {request.approvedAt && (
                    <div>
                      <div className="text-xs text-gray-600 mb-1">
                        {request.status === 'approved' ? 'Approved' : 'Rejected'}
                      </div>
                      <div className="text-sm">
                        {formatStudioTime(request.approvedAt, 'MMM d, yyyy')}
                      </div>
                    </div>
                  )}
                </div>

                {request.customerNotes && (
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <div className="text-xs text-gray-600 mb-1">Customer Notes</div>
                    <div className="text-sm">{request.customerNotes}</div>
                  </div>
                )}

                {request.rejectionReason && (
                  <div className="mb-4 p-3 bg-red-50 rounded">
                    <div className="text-xs text-red-600 mb-1">Rejection Reason</div>
                    <div className="text-sm text-red-800">{request.rejectionReason}</div>
                  </div>
                )}

                {request.status === 'pending' && (
                  <div className="flex gap-3 mt-4">
                    <Button
                      onClick={() => handleApprove(request._id)}
                      className="flex-1"
                    >
                      Approve Session
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleReject(request._id)}
                      className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Toaster position="top-right" />
    </div>
  );
}
