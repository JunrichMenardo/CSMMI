'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserRole, createManagerRequest, getManagerId } from '@/lib/managerUtils';
import { Container, Stock, Truck } from '@/types';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { fetchContainers, fetchStocks, fetchStocksByContainer, fetchTrucks, deleteContainer } from '@/lib/api';
import { Package, ArrowLeft, Trash2, Archive } from 'lucide-react';
import { StockMonitoring } from '@/components/StockMonitoring';
import { AddContainerForm } from '@/components/AddContainerForm';
import { EditContainerForm } from '@/components/EditContainerForm';

export default function ContainersPage() {
  const router = useRouter();
  const [containers, setContainers] = useState<Container[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [containerStocks, setContainerStocks] = useState<Map<string, Stock[]>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'number' | 'status'>('number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Calculate container status based on truck assignment and stocks
  const calculateContainerStatus = (container: Container, stocks: Stock[]): string => {
    // If marked as delivered
    if (container.status === 'Delivered') {
      return 'Delivered';
    }

    const hasStocks = stocks.length > 0;
    const hasAssignedTruck = !!container.truck_id;

    // If has truck assigned
    if (hasAssignedTruck) {
      return 'In Transit';
    }
    // If has stocks but no truck
    if (hasStocks) {
      return 'Stored';
    }
    // No truck and no stocks
    return 'Available';
  };

  // Get the dynamic status for a container
  const getContainerStatus = (container: Container): string => {
    const stocks = containerStocks.get(container.id) || [];
    return calculateContainerStatus(container, stocks);
  };

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

  // Load containers and their stocks
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      try {
        const [containersData, trucksData] = await Promise.all([
          fetchContainers(),
          fetchTrucks(),
        ]);
        setContainers(containersData);
        setTrucks(trucksData);

        // Load stocks for all containers
        const stocksMap = new Map<string, Stock[]>();
        for (const container of containersData) {
          try {
            const stocks = await fetchStocksByContainer(container.id);
            stocksMap.set(container.id, stocks);
          } catch (err) {
            console.error(`Failed to load stocks for container ${container.id}:`, err);
            stocksMap.set(container.id, []);
          }
        }
        setContainerStocks(stocksMap);
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
        async (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setContainers((prev) => [...prev, payload.new]);
            // Load stocks for new container
            try {
              const stocks = await fetchStocksByContainer(payload.new.id);
              setContainerStocks((prev) => new Map(prev).set(payload.new.id, stocks));
            } catch (err) {
              console.error('Failed to load stocks for new container:', err);
              setContainerStocks((prev) => new Map(prev).set(payload.new.id, []));
            }
          } else if (payload.eventType === 'UPDATE') {
            setContainers((prev) =>
              prev.map((c) => (c.id === payload.new.id ? payload.new : c))
            );
          } else if (payload.eventType === 'DELETE') {
            setContainers((prev) => prev.filter((c) => c.id !== payload.old.id));
            setContainerStocks((prev) => {
              const newMap = new Map(prev);
              newMap.delete(payload.old.id);
              return newMap;
            });
          }
        }
      )
      .subscribe();

    // Also subscribe to stocks changes to update status dynamically
    const stocksChannel = supabase.channel('stocks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stocks' },
        async (payload: any) => {
          // Reload all container stocks to recalculate statuses
          if (payload.new?.container_id || payload.old?.container_id) {
            const containerId = payload.new?.container_id || payload.old?.container_id;
            try {
              const stocks = await fetchStocksByContainer(containerId);
              setContainerStocks((prev) => new Map(prev).set(containerId, stocks));
            } catch (err) {
              console.error(`Failed to reload stocks for container ${containerId}:`, err);
            }
          }
        }
      )
      .subscribe();

    // Subscribe to truck updates
    const trucksChannel = supabase.channel('trucks')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trucks' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setTrucks((prev) => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setTrucks((prev) =>
              prev.map((t) => (t.id === payload.new.id ? payload.new : t))
            );
          } else if (payload.eventType === 'DELETE') {
            setTrucks((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      stocksChannel.unsubscribe();
      trucksChannel.unsubscribe();
    };
  }, [isAuthenticated]);

  const handleDeleteContainer = async (containerId: string) => {
    if (!confirm('Are you sure you want to delete this container?')) {
      return;
    }

    try {
      // Check user role
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        alert('You must be logged in');
        return;
      }

      const userRole = await getUserRole(session.user.id);

      const container = containers.find((c) => c.id === containerId);
      if (!container) {
        alert('Container not found');
        return;
      }

      // Manager: Create delete request
      if (userRole === 'manager') {
        const managerId = await getManagerId(session.user.id);
        if (!managerId) {
          alert('Manager account not found');
          return;
        }

        const created = await createManagerRequest(
          managerId,
          'delete_container',
          'container',
          container,
          containerId
        );

        if (created) {
          alert('✅ Delete request submitted for admin approval!\n\nThe container will be moved to trash after the admin reviews and approves your request.');
        } else {
          alert('Failed to submit delete request');
        }
        return;
      }

      // Admin: Move container to trash
      // Insert into trash table
      const { error: trashError } = await supabase.from('trash').insert([
        {
          entity_id: containerId,
          entity_type: 'container',
          entity_data: container,
          deleted_by: session.user.id,
        },
      ]);

      if (trashError) {
        console.error('Failed to move to trash:', trashError);
        alert('Failed to delete container — could not move to trash');
        return;
      }

      // Delete container from original table
      await deleteContainer(containerId);
      setContainers((prev) => prev.filter((c) => c.id !== containerId));
      setSelectedContainerId(null);
      alert('✅ Container moved to trash');
    } catch (error) {
      console.error('Failed to delete container:', error);
      alert('Failed to delete container');
    }
  };

  const handleArchiveContainer = async (containerId: string) => {
    if (!confirm('Are you sure you want to archive this container?')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        alert('You must be logged in');
        return;
      }

      const userRole = await getUserRole(session.user.id);
      const container = containers.find((c) => c.id === containerId);

      if (!container) {
        alert('Container not found');
        return;
      }

      if (userRole === 'manager') {
        const managerId = await getManagerId(session.user.id);
        if (!managerId) {
          alert('Manager account not found');
          return;
        }

        const created = await createManagerRequest(
          managerId,
          'archive_container',
          'container',
          container,
          containerId
        );

        if (created) {
          alert('✅ Archive request submitted for admin approval!');
        } else {
          alert('Failed to submit archive request');
        }
        return;
      }

      const { error: insertError } = await supabase.from('archives').insert([
        {
          entity_id: container.id,
          name: container.container_number,
          type: 'container',
          payload: container,
          archived_at: new Date().toISOString(),
        },
      ]);

      if (insertError) {
        console.error('Failed to archive: could not write to archives table:', insertError);
        alert('Failed to archive container — archives storage is not available. Aborting.');
        return;
      }

      await deleteContainer(containerId);
      setContainers((prev) => prev.filter((c) => c.id !== containerId));
      setSelectedContainerId(null);
    } catch (error) {
      console.error('Failed to archive container:', error);
      alert('Failed to archive container');
    }
  };

  const selectedContainer = containers.find((c) => c.id === selectedContainerId);

  const containerStatusColors: Record<string, string> = {
    Available: 'bg-gray-100 text-gray-800',
    'In Transit': 'bg-yellow-100 text-yellow-800',
    Stored: 'bg-blue-100 text-blue-800',
    Delivered: 'bg-green-100 text-green-800',
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

      <main className="dashboard-main px-4 sm:px-6 lg:px-8 py-8 lg:ml-64">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-black">Container Management</h1>
          <AddContainerForm
            onContainerAdded={(newContainer) => {
              setContainers((prev) => [newContainer, ...prev]);
              // Initialize stocks for new container (typically empty on creation)
              setContainerStocks((prev) => new Map(prev).set(newContainer.id, []));
            }}
          />
        </div>
        {/* Search + Sort */}
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full lg:max-w-md">
              <label className="mb-1 block text-sm font-medium text-gray-700">Search</label>
              <input
                type="text"
                placeholder="Search containers by number or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="number">Container #</option>
                  <option value="status">Status</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Order</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Container List */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-4 text-black">Containers ({containers.length})</h2>

            {containers.length === 0 ? (
              <p className="text-black">No containers available</p>
            ) : (
              <div className="space-y-2">
                  {containers
                    .filter((c) => {
                      const q = searchTerm.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        c.container_number.toLowerCase().includes(q) ||
                        (c.status || '').toLowerCase().includes(q)
                      );
                    })
                    .sort((a, b) => {
                      const dir = sortOrder === 'asc' ? 1 : -1;
                      if (sortBy === 'number') return a.container_number.localeCompare(b.container_number) * dir;
                      return (a.status || '').localeCompare(b.status || '') * dir;
                    })
                    .map((container) => (
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
                        <p className="text-xs text-black">{getContainerStatus(container)}</p>
                      </div>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          containerStatusColors[getContainerStatus(container)]
                        }`}
                      >
                        {getContainerStatus(container)}
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
                        onClick={() => handleArchiveContainer(selectedContainer.id)}
                        className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition"
                        title="Archive container"
                      >
                        <Archive size={20} />
                        Archive
                      </button>
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
                          containerStatusColors[getContainerStatus(selectedContainer)]
                        }`}
                      >
                        {getContainerStatus(selectedContainer)}
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
                        <p className="font-medium text-blue-900">
                          ✓ {trucks.find((t) => t.id === selectedContainer.truck_id)?.name || 'Unknown Truck'}
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          Driver: {trucks.find((t) => t.id === selectedContainer.truck_id)?.driver_name || 'N/A'}
                        </p>
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
