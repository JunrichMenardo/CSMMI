'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserRole } from '@/lib/managerUtils';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Clock, CheckCircle, XCircle } from 'lucide-react';

interface ManagerRequest {
  id: string;
  request_type: string;
  entity_type: string;
  entity_id: string | null;
  action_data: any;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export default function MyRequestsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [requests, setRequests] = useState<ManagerRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    let subscription: any = null;

    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/auth');
        return;
      }

      const userId = data.session.user.id;

      // Check if user is manager
      const role = await getUserRole(userId);
      if (role !== 'manager') {
        router.push('/dashboard');
        return;
      }

      setIsAuthenticated(true);
      setLoading(false);

      // Load requests for this manager
      loadRequests(userId);

      // Subscribe to real-time updates
      const managerResult = await supabase
        .from('managers')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (managerResult.data) {
        subscription = supabase
          .channel('manager-requests-channel')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'manager_requests',
              filter: `manager_id=eq.${managerResult.data.id}`,
            },
            () => {
              loadRequests(userId);
            }
          )
          .subscribe();
      }
    };

    checkAuth();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [router]);

  const loadRequests = async (userId: string) => {
    try {
      // Get manager ID
      const managerResult = await supabase
        .from('managers')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!managerResult.data) return;

      // Get manager's requests
      const { data, error } = await supabase
        .from('manager_requests')
        .select('*')
        .eq('manager_id', managerResult.data.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={20} className="text-yellow-500" />;
      case 'approved':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'rejected':
        return <XCircle size={20} className="text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 border border-yellow-200';
      case 'approved':
        return 'bg-green-50 border border-green-200';
      case 'rejected':
        return 'bg-red-50 border border-red-200';
      default:
        return 'bg-gray-50 border border-gray-200';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
      case 'approved':
        return 'bg-green-100 text-green-800 border border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-300';
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (filter === 'all') return true;
    return req.status === filter;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-xl font-semibold text-gray-700">Loading requests...</div>
      </div>
    );
  }

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar />

      <main className="dashboard-main flex-1 flex flex-col lg:ml-64">
        <Header />

        {/* Requests Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">My Requests</h1>
            <p className="text-gray-600">View the status of your submitted requests for admin approval</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
              }`}
            >
              All ({requests.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                filter === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
              }`}
            >
              <Clock size={16} />
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                filter === 'approved'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
              }`}
            >
              <CheckCircle size={16} />
              Approved ({approvedCount})
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                filter === 'rejected'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
              }`}
            >
              <XCircle size={16} />
              Rejected ({rejectedCount})
            </button>
          </div>

          {/* Requests List */}
          {filteredRequests.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <p className="text-gray-600 font-medium">
                {filter === 'all'
                  ? 'No requests submitted yet'
                  : `No ${filter} requests`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className={`rounded-lg shadow-md p-6 ${getStatusColor(request.status)}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(request.status)}
                      <div>
                        <h3 className="font-bold text-gray-900 capitalize">
                          {request.request_type.replace(/_/g, ' ')}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(request.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusBadgeColor(
                        request.status
                      )}`}
                    >
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>

                  <div className="bg-white/50 rounded-lg p-4 mb-3">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Request Details:</h4>
                    <pre className="text-xs text-gray-600 overflow-x-auto bg-gray-100 p-3 rounded border border-gray-300">
                      {JSON.stringify(request.action_data, null, 2)}
                    </pre>
                  </div>

                  {request.status === 'rejected' && request.rejection_reason && (
                    <div className="bg-red-100/50 border border-red-300 rounded-lg p-3 mt-3">
                      <h4 className="font-semibold text-red-900 text-sm mb-1">Admin's Reason:</h4>
                      <p className="text-sm text-red-800">{request.rejection_reason}</p>
                    </div>
                  )}

                  {request.status === 'approved' && request.reviewed_at && (
                    <div className="bg-green-100/50 border border-green-300 rounded-lg p-3 mt-3">
                      <p className="text-xs text-green-800">
                        ✓ Approved on {new Date(request.reviewed_at).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {request.status === 'pending' && (
                    <div className="bg-yellow-100/50 border border-yellow-300 rounded-lg p-3 mt-3">
                      <p className="text-xs text-yellow-800">
                        ⏳ Waiting for admin approval...
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
