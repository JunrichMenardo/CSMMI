'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Container, Stock, Truck } from '@/types';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { fetchContainers, fetchStocks, fetchStocksByContainer, fetchTrucks, deleteContainer } from '@/lib/api';
import { Package, ArrowLeft, Trash2 } from 'lucide-react';
import { StockMonitoring } from '@/components/StockMonitoring';
import { AddContainerForm } from '@/components/AddContainerForm';
import { EditContainerForm } from '@/components/EditContainerForm';

export default function ContainersPage() {
  const router = useRouter();
  const [containers, setContainers] = useState<Container[]>([]);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/auth');
        return;
      }
      setIsAuthenticated(true);
    };
    checkAuth();
  }, [router]);

  // Load containers
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      try {
        const data = await fetchContainers();
        setContainers(data);
      } catch (err) {
        console.error('Failed to load containers:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!isAuthenticated) return;

    const channel = supabase.channel('containers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'containers' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setContainers((prev) => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setContainers((prev) =>
              prev.map((c) => (c.id === payload.new.id ? payload.new : c))
            );
          } else if (payload.eventType === 'DELETE') {
            setContainers((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [isAuthenticated]);

  const handleDeleteContainer = async (containerId: string) => {
    if (!confirm('Are you sure you want to delete this container?')) {
      return;
    }

    try {
      await deleteContainer(containerId);
      setContainers((prev) => prev.filter((c) => c.id !== containerId));
      setSelectedContainerId(null);
    } catch (error) {
      console.error('Failed to delete container:', error);
      alert('Failed to delete container');
    }
  };

  const selectedContainer = containers.find((c) => c.id === selectedContainerId);

  const containerStatusColors: Record<string, string> = {
    Available: 'bg-green-100 text-green-800',
    'In Transit': 'bg-yellow-100 text-yellow-800',
    Stored: 'bg-blue-100 text-blue-800',
  };

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-black">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      <Header title="Container Management" />

      <main className="ml-64 px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-black">Container Management</h1>
          <AddContainerForm
            onContainerAdded={(newContainer) => {
              setContainers((prev) => [newContainer, ...prev]);
            }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Container List */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-4 text-black">Containers ({containers.length})</h2>

            {containers.length === 0 ? (
              <p className="text-black">No containers available</p>
            ) : (
              <div className="space-y-2">
                {containers.map((container) => (
                  <button
                    key={container.id}
                    onClick={() => setSelectedContainerId(container.id)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition ${
                      selectedContainerId === container.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-sm text-black">{container.container_number}</p>
                        <p className="text-xs text-black">{container.status}</p>
                      </div>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          containerStatusColors[container.status]
                        }`}
                      >
                        {container.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Container Details and Stock */}
          <div className="lg:col-span-2 space-y-6">
            {selectedContainer ? (
              <>
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-black">
                      <Package className="w-5 h-5" />
                      {selectedContainer.container_number}
                    </h3>
                    <div className="flex gap-2">
                      <EditContainerForm
                        container={selectedContainer}
                        onContainerUpdated={(updatedContainer) => {
                          setContainers((prev) =>
                            prev.map((c) =>
                              c.id === updatedContainer.id ? updatedContainer : c
                            )
                          );
                        }}
                      />
                      <button
                        onClick={() => handleDeleteContainer(selectedContainer.id)}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
                        title="Delete container"
                      >
                        <Trash2 size={20} />
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-black text-sm">Container ID</p>
                      <p className="font-medium text-black">{selectedContainer.id}</p>
                    </div>
                    <div>
                      <p className="text-black text-sm">Status</p>
                      <p
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          containerStatusColors[selectedContainer.status]
                        }`}
                      >
                        {selectedContainer.status}
                      </p>
                    </div>
                    <div>
                      <p className="text-black text-sm">Origin</p>
                      <p className="font-medium text-black">{selectedContainer.origin_location || '-'}</p>
                    </div>
                  </div>

                  {/* Truck Info */}
                  {selectedContainer.truck_id && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-black text-sm mb-2">Assigned Truck</p>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="font-medium text-blue-900">✓ Truck ID: {selectedContainer.truck_id}</p>
                      </div>
                    </div>
                  )}
                </div>

                <StockMonitoring
                  containerId={selectedContainer.id}
                  containerName={selectedContainer.container_number}
                />
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-6 flex items-center justify-center min-h-96">
                <p className="text-black text-center">
                  Select a container to view details and stock
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
