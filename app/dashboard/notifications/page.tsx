'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserRole } from '@/lib/managerUtils';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface ManagerRequest {
  id: string;
  manager_id: string;
  manager_email?: string;
  request_type: string;
  entity_type: string;
  entity_id?: string;
  action_data: any;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

type LocationMarkerPayload = {
  lat: number;
  lng: number;
  name: string;
  type: 'port' | 'store' | 'plant';
};

export default function NotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [requests, setRequests] = useState<ManagerRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<{ [key: string]: string }>({});
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/auth');
        return;
      }

      // Only admins can access this page
      const role = await getUserRole(data.session.user.id);
      if (role === 'manager') {
        router.push('/dashboard/my-requests');
        return;
      }

      setIsAuthenticated(true);
      loadRequests();
      setLoading(false);

      // Clean up any stale manager_requests channels before creating new subscription
      const channels = supabase.getChannels();
      const staleChannel = channels.find(ch => ch.topic === 'realtime:manager_requests');
      if (staleChannel) {
        await supabase.removeChannel(staleChannel);
      }

      // Subscribe to real-time updates
      const subscription = supabase
        .channel('manager_requests')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'manager_requests',
          },
          () => {
            loadRequests();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    };
    checkAuth();
  }, [router]);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('manager_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with manager email
      const enrichedData = await Promise.all(
        (data || []).map(async (req) => {
          const { data: manager } = await supabase
            .from('managers')
            .select('email')
            .eq('id', req.manager_id)
            .single();
          return { ...req, manager_email: manager?.email };
        })
      );

      setRequests(enrichedData);
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const request = requests.find((r) => r.id === requestId);
      if (!request) return;

      // Confirm with admin for destructive actions
      if (request.request_type.startsWith('delete') || request.request_type.startsWith('archive')) {
        const ok = confirm('This action will modify or remove data. Are you sure you want to proceed?');
        if (!ok) {
          setProcessingId(null);
          return;
        }
      }

      // Execute the action based on request type
      const actionSucceeded = await executeApprovedAction(request);
      if (!actionSucceeded) {
        throw new Error('Approved action failed to execute');
      }

      // Update the request status only after the action succeeds
      const { error: updateError } = await supabase
        .from('manager_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getSession()).data.session?.user.id,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Reload requests
      await loadRequests();
    } catch (error) {
      console.error('Error approving request:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!rejectReason[requestId]) {
      alert('Please provide a reason for rejection');
      return;
    }

    setProcessingId(requestId);
    try {
      const { error } = await supabase
        .from('manager_requests')
        .update({
          status: 'rejected',
          rejection_reason: rejectReason[requestId],
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getSession()).data.session?.user.id,
        })
        .eq('id', requestId);

      if (error) throw error;

      setRejectReason((prev) => {
        const newReason = { ...prev };
        delete newReason[requestId];
        return newReason;
      });
      setShowRejectModal(null);
      await loadRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const executeApprovedAction = async (request: ManagerRequest): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const reviewerId = session?.user?.id ?? null;

      switch (request.request_type) {
        case 'add_truck':
          {
            const { error } = await supabase.from('trucks').insert([request.action_data]);
            if (error) throw error;
          }
          break;
        case 'edit_truck':
          {
            const { error } = await supabase
              .from('trucks')
              .update(request.action_data)
              .eq('id', request.entity_id);
            if (error) throw error;
          }
          break;
        case 'delete_truck':
          {
            const { data: truckData, error: fetchTruckError } = await supabase
              .from('trucks')
              .select('*')
              .eq('id', request.entity_id)
              .maybeSingle();
            if (fetchTruckError) throw fetchTruckError;

            const truckPayload = truckData ?? request.action_data;
            if (truckPayload) {
              const { error: trashError } = await supabase.from('trash').insert([
                {
                  entity_id: request.entity_id,
                  entity_type: 'truck',
                  entity_data: truckPayload,
                  deleted_by: reviewerId,
                },
              ]);
              if (trashError) throw trashError;
            }

            const { error } = await supabase.from('trucks').delete().eq('id', request.entity_id);
            if (error) throw error;
          }
          break;
        case 'add_container':
          {
            const { error } = await supabase.from('containers').insert([request.action_data]);
            if (error) throw error;
          }
          break;
        case 'edit_container':
          {
            const { error } = await supabase
              .from('containers')
              .update(request.action_data)
              .eq('id', request.entity_id);
            if (error) throw error;
          }
          break;
        case 'delete_container':
          {
            const { data: containerData, error: fetchContainerError } = await supabase
              .from('containers')
              .select('*')
              .eq('id', request.entity_id)
              .maybeSingle();
            if (fetchContainerError) throw fetchContainerError;

            const containerPayload = containerData ?? request.action_data;
            if (containerPayload) {
              const { error: trashError } = await supabase.from('trash').insert([
                {
                  entity_id: request.entity_id,
                  entity_type: 'container',
                  entity_data: containerPayload,
                  deleted_by: reviewerId,
                },
              ]);
              if (trashError) throw trashError;
            }

            const { error } = await supabase.from('containers').delete().eq('id', request.entity_id);
            if (error) throw error;
          }
          break;
        case 'add_stock':
          {
            const { error } = await supabase.from('stocks').insert([request.action_data]);
            if (error) throw error;
          }
          break;
        case 'edit_stock':
          {
            const { error } = await supabase
              .from('stocks')
              .update(request.action_data)
              .eq('id', request.entity_id);
            if (error) throw error;
          }
          break;
        case 'delete_stock':
          {
            const { data: stockData, error: fetchStockError } = await supabase
              .from('stocks')
              .select('*')
              .eq('id', request.entity_id)
              .maybeSingle();
            if (fetchStockError) throw fetchStockError;

            const stockPayload = stockData ?? request.action_data;
            if (stockPayload) {
              const { error: trashError } = await supabase.from('trash').insert([
                {
                  entity_id: request.entity_id,
                  entity_type: 'stock',
                  entity_data: stockPayload,
                  deleted_by: reviewerId,
                },
              ]);
              if (trashError) throw trashError;
            }

            const { error } = await supabase.from('stocks').delete().eq('id', request.entity_id);
            if (error) throw error;
          }
          break;
        case 'add_location_marker':
          {
            const markerData = request.action_data as LocationMarkerPayload;
            const normalizedMarker = {
              lat: Number(markerData.lat),
              lng: Number(markerData.lng),
              name: String(markerData.name).trim(),
              type: markerData.type,
            };

            const { data, error } = await supabase
              .from('location_markers')
              .insert([normalizedMarker])
              .select('*')
              .single();

            if (error) throw error;

            console.log('✅ Location marker approved and stored:', data);
          }
          break;
        case 'delete_location_marker':
          {
            const { error } = await supabase.from('location_markers').delete().eq('id', request.entity_id);
            if (error) throw error;
          }
          break;
        case 'archive_truck':
          {
            const truckData = request.action_data;
            const { error: archiveInsertError } = await supabase.from('archives').insert([
              {
                entity_id: request.entity_id,
                name: truckData?.name || null,
                type: 'truck',
                payload: truckData,
                archived_at: new Date().toISOString(),
              },
            ]);
            if (archiveInsertError) {
              console.error('Failed to archive during approval:', archiveInsertError);
              throw archiveInsertError;
            }

            const { error } = await supabase.from('trucks').delete().eq('id', request.entity_id);
            if (error) throw error;
          }
          break;
        case 'archive_container':
          {
            const containerData = request.action_data;
            const { error: archiveInsertError2 } = await supabase.from('archives').insert([
              {
                entity_id: request.entity_id,
                name: containerData?.container_number || null,
                type: 'container',
                payload: containerData,
                archived_at: new Date().toISOString(),
              },
            ]);
            if (archiveInsertError2) {
              console.error('Failed to archive during approval:', archiveInsertError2);
              throw archiveInsertError2;
            }

            const { error } = await supabase.from('containers').delete().eq('id', request.entity_id);
            if (error) throw error;
          }
          break;
        case 'archive_stock':
          {
            const stockData = request.action_data;
            const { error: archiveInsertError3 } = await supabase.from('archives').insert([
              {
                entity_id: request.entity_id,
                name: stockData?.item_name || null,
                type: 'stock',
                payload: stockData,
                archived_at: new Date().toISOString(),
              },
            ]);
            if (archiveInsertError3) {
              console.error('Failed to archive during approval:', archiveInsertError3);
              throw archiveInsertError3;
            }

            const { error } = await supabase.from('stocks').delete().eq('id', request.entity_id);
            if (error) throw error;
          }
          break;
        default:
          throw new Error(`Unsupported request type: ${request.request_type}`);
      }
      return true;
    } catch (error) {
      console.error('Error executing approved action:', error);
      return false;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="text-yellow-500" size={20} />;
      case 'approved':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'rejected':
        return <XCircle className="text-red-500" size={20} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 border-yellow-200';
      case 'approved':
        return 'bg-green-50 border-green-200';
      case 'rejected':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (filter === 'all') return true;
    return req.status === filter;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-black">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      <Header />

      <main className="dashboard-main px-4 sm:px-6 lg:px-8 py-8 lg:ml-64">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black">Manager Requests</h1>
              <p className="text-black mt-2">Review and approve/reject manager actions</p>
            </div>
            {pendingCount > 0 && (
              <div className="bg-yellow-100 border border-yellow-300 rounded-lg px-4 py-2">
                <p className="text-yellow-800 font-semibold">{pendingCount} Pending Request{pendingCount !== 1 ? 's' : ''}</p>
              </div>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-black hover:bg-gray-100'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'pending' && pendingCount > 0 && (
                <span className="ml-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Requests List */}
        {filteredRequests.length > 0 ? (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className={`border rounded-lg p-6 ${getStatusColor(request.status)}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(request.status)}
                    <div>
                      <h3 className="font-semibold text-black text-lg">
                        {request.request_type.replace(/_/g, ' ').toUpperCase()}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Manager: <span className="font-medium">{request.manager_email}</span>
                      </p>
                      <p className="text-sm text-gray-600">
                        Requested: {new Date(request.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-white">
                    {request.entity_type.toUpperCase()}
                  </span>
                </div>

                {/* Action Data Display */}
                <div className="bg-white rounded p-3 mb-4">
                  <p className="text-xs font-semibold text-gray-600 mb-2">REQUEST DATA:</p>
                  <pre className="text-xs text-gray-700 overflow-auto max-h-40">
                    {JSON.stringify(request.action_data, null, 2)}
                  </pre>
                </div>

                {/* Status-specific Info */}
                {request.status === 'rejected' && request.rejection_reason && (
                  <div className="bg-red-100 border border-red-300 rounded p-3 mb-4">
                    <p className="text-sm text-red-800">
                      <strong>Rejection Reason:</strong> {request.rejection_reason}
                    </p>
                  </div>
                )}

                {request.status === 'approved' && (
                  <div className="bg-green-100 border border-green-300 rounded p-3 mb-4">
                    <p className="text-sm text-green-800">
                      ✓ Approved on {new Date(request.reviewed_at || '').toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                {request.status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(request.id)}
                      disabled={processingId === request.id}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={18} />
                      {processingId === request.id ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => setShowRejectModal(request.id)}
                      disabled={processingId === request.id}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <XCircle size={18} />
                      Reject
                    </button>
                  </div>
                )}

                {/* Reject Modal */}
                {showRejectModal === request.id && (
                  <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-lg">
                    <label className="block text-sm font-medium text-red-900 mb-2">
                      Reason for rejection:
                    </label>
                    <textarea
                      value={rejectReason[request.id] || ''}
                      onChange={(e) =>
                        setRejectReason((prev) => ({
                          ...prev,
                          [request.id]: e.target.value,
                        }))
                      }
                      placeholder="Explain why you're rejecting this request..."
                      className="w-full px-3 py-2 border border-red-300 rounded text-black bg-white mb-3"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReject(request.id)}
                        disabled={processingId === request.id}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded transition"
                      >
                        {processingId === request.id ? 'Processing...' : 'Confirm Reject'}
                      </button>
                      <button
                        onClick={() => {
                          setShowRejectModal(null);
                          setRejectReason((prev) => {
                            const newReason = { ...prev };
                            delete newReason[request.id];
                            return newReason;
                          });
                        }}
                        className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-medium py-2 rounded transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">
              {filter === 'pending'
                ? 'No pending requests'
                : `No ${filter} requests`}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
