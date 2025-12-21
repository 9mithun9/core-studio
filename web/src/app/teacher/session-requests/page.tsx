'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { formatStudioTime } from '@/lib/date';
import toast, { Toaster } from 'react-hot-toast';

export default function TeacherSessionRequests() {
  const { t } = useTranslation('teacher');
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
    return <div className="text-center py-12 text-sm md:text-base">{t('session_requests.loading')}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t('session_requests.title')}</h1>
          <p className="text-gray-600 mt-2 text-xs md:text-sm">{t('session_requests.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
            size="sm"
          >
            <span className="text-xs md:text-sm">{t('session_requests.pending')}</span>
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            <span className="text-xs md:text-sm">{t('session_requests.all')}</span>
          </Button>
          <Button
            variant={filter === 'approved' ? 'default' : 'outline'}
            onClick={() => setFilter('approved')}
            size="sm"
          >
            <span className="text-xs md:text-sm">{t('session_requests.approved')}</span>
          </Button>
          <Button
            variant={filter === 'auto-confirmed' ? 'default' : 'outline'}
            onClick={() => setFilter('auto-confirmed')}
            size="sm"
          >
            <span className="text-xs md:text-sm">{t('session_requests.auto_confirmed')}</span>
          </Button>
          <Button
            variant={filter === 'rejected' ? 'default' : 'outline'}
            onClick={() => setFilter('rejected')}
            size="sm"
          >
            <span className="text-xs md:text-sm">{t('session_requests.rejected')}</span>
          </Button>
        </div>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500 text-sm md:text-base">
            <p>{t('session_requests.no_requests', { filter: filter === 'pending' ? t('session_requests.pending').toLowerCase() : '' })}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:gap-4">
          {requests.map((request) => (
            <Card key={request._id}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <h3 className="text-base md:text-lg font-bold">
                      {request.customerId?.userId?.name || t('session_requests.unknown_customer')}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600 mt-1">
                      {request.customerId?.userId?.email}
                    </p>
                  </div>
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-xs font-medium self-start ${
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">{t('session_requests.date_time')}</div>
                    <div className="font-semibold text-sm md:text-base">
                      {formatStudioTime(request.startTime, 'PPP')}
                    </div>
                    <div className="text-xs md:text-sm text-gray-600">
                      {formatStudioTime(request.startTime, 'p')}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">{t('session_requests.session_type')}</div>
                    <div className="font-semibold text-sm md:text-base capitalize">{request.type}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">{t('session_requests.requested')}</div>
                    <div className="text-xs md:text-sm">
                      {formatStudioTime(request.createdAt, 'MMM d, yyyy')}
                    </div>
                  </div>
                  {request.approvedAt && (
                    <div>
                      <div className="text-xs text-gray-600 mb-1">
                        {request.status === 'approved' ? t('session_requests.approved') : t('session_requests.rejected')}
                      </div>
                      <div className="text-xs md:text-sm">
                        {formatStudioTime(request.approvedAt, 'MMM d, yyyy')}
                      </div>
                    </div>
                  )}
                </div>

                {request.customerNotes && (
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <div className="text-xs text-gray-600 mb-1">{t('session_requests.customer_notes')}</div>
                    <div className="text-xs md:text-sm">{request.customerNotes}</div>
                  </div>
                )}

                {request.rejectionReason && (
                  <div className="mb-4 p-3 bg-red-50 rounded">
                    <div className="text-xs text-red-600 mb-1">{t('session_requests.rejection_reason')}</div>
                    <div className="text-xs md:text-sm text-red-800">{request.rejectionReason}</div>
                  </div>
                )}

                {request.status === 'pending' && (
                  <div className="flex flex-col sm:flex-row gap-3 mt-4">
                    <Button
                      onClick={() => handleApprove(request._id)}
                      className="flex-1"
                      size="sm"
                    >
                      <span className="text-xs md:text-sm">{t('session_requests.approve_session')}</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleReject(request._id)}
                      className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                      size="sm"
                    >
                      <span className="text-xs md:text-sm">{t('session_requests.reject')}</span>
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
