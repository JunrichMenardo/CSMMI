'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserRole, createManagerRequest, getManagerId } from '@/lib/managerUtils';
import { Truck, Container, Stock } from '@/types';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { AddTruckForm } from '@/components/AddTruckForm';
import { EditTruckForm } from '@/components/EditTruckForm';
import { fetchTrucks, fetchContainers, fetchStocks, fetchStocksByContainer, deleteTruck } from '@/lib/api';
import { Trash2, MapPin, Archive } from 'lucide-react';

export default function TruckManagementPage() {
  const router = useRouter();
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'driver' | 'status' | 'capacity'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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

  // Load trucks
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadTrucks = async () => {
      try {
        const [trucksData, containersData, stocksData] = await Promise.all([
          fetchTrucks(),
          fetchContainers(),
          fetchStocks(),
        ]);
        setTrucks(trucksData);
        setContainers(containersData);
        setStocks(stocksData);
      } catch (error) {
        console.error('Failed to load trucks:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTrucks();

    // Subscribe to truck updates
    const channel = supabase.channel('trucks-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trucks' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setTrucks((prev) => [payload.new, ...prev]);
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
    };
  }, [isAuthenticated]);

  // Subscribe to containers and stocks updates
  useEffect(() => {
    if (!isAuthenticated) return;

    const containersChannel = supabase.channel('containers-updates');
    containersChannel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'containers' },
      async (payload: any) => {
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
    );

    const stocksChannel = supabase.channel('stocks-updates');
    stocksChannel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'stocks' },
      (payload: any) => {
        if (payload.eventType === 'INSERT') {
          setStocks((prev) => [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setStocks((prev) =>
            prev.map((s) => (s.id === payload.new.id ? payload.new : s))
          );
        } else if (payload.eventType === 'DELETE') {
          setStocks((prev) => prev.filter((s) => s.id !== payload.old.id));
        }
      }
    );

    containersChannel.subscribe();
    stocksChannel.subscribe();

    return () => {
      containersChannel.unsubscribe();
      stocksChannel.unsubscribe();
    };
  }, [isAuthenticated]);

  // Calculate truck status dynamically based on assigned containers and their stocks
  const calculateTruckStatus = (truck: Truck): string => {
    const assignedContainers = containers.filter((c) => c.truck_id === truck.id);
    if (assignedContainers.length === 0) {
      return 'Idle';
    }

    // Check if any assigned container has stocks
    const containerIds = assignedContainers.map((c) => c.id);
    const containersWithStocks = stocks.filter((s) => s.container_id && containerIds.includes(s.container_id));
    return containersWithStocks.length > 0 ? 'Delivering' : 'Getting Stocks';
  };

  // Search + sort
  const displayedTrucks = trucks
    .filter((t) => {
      const q = searchTerm.trim().toLowerCase();
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        (t.driver_name || '').toLowerCase().includes(q) ||
        (t.status || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'name') return a.name.localeCompare(b.name) * dir;
      if (sortBy === 'driver') return (a.driver_name || '').localeCompare(b.driver_name || '') * dir;
      if (sortBy === 'status') return (a.status || '').localeCompare(b.status || '') * dir;
      if (sortBy === 'capacity') return (a.capacity - b.capacity) * dir;
      return 0;
    });

  const handleDeleteTruck = async (truckId: string) => {
    if (!confirm('Are you sure you want to delete this truck?')) {
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

      // Manager: Create delete request
      if (userRole === 'manager') {
        const managerId = await getManagerId(session.user.id);
        if (!managerId) {
          alert('Manager account not found');
          return;
        }

        const created = await createManagerRequest(
          managerId,
          'delete_truck',
          'truck',
          { id: truckId },
          truckId
        );

        if (created) {
          alert('✅ Delete request submitted for admin approval!\n\nThe truck will be deleted after the admin reviews and approves your request.');
        } else {
          alert('Failed to submit delete request');
        }
        return;
      }

      // Admin: Delete truck directly
      await deleteTruck(truckId);
      setTrucks((prev) => prev.filter((t) => t.id !== truckId));
    } catch (error) {
      console.error('Failed to delete truck:', error);
      alert('Failed to delete truck');
    }
  };

  const handleArchiveTruck = async (truckId: string) => {
    if (!confirm('Are you sure you want to archive this truck?')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        alert('You must be logged in');
        return;
      }

      const userRole = await getUserRole(session.user.id);
      const truck = trucks.find((t) => t.id === truckId);

      if (!truck) {
        alert('Truck not found');
        return;
      }

      // Manager: create archive request for admin approval
      if (userRole === 'manager') {
        const managerId = await getManagerId(session.user.id);
        if (!managerId) {
          alert('Manager account not found');
          return;
        }

        const created = await createManagerRequest(
          managerId,
          'archive_truck',
          'truck',
          truck,
          truckId
        );

        if (created) {
          alert('✅ Archive request submitted for admin approval!');
        } else {
          alert('Failed to submit archive request');
        }
        return;
      }

      // Admin: archive immediately
      const { error: insertError } = await supabase.from('archives').insert([
        {
          entity_id: truck.id,
          name: truck.name,
          type: 'truck',
          payload: truck,
          archived_at: new Date().toISOString(),
        },
      ]);

      if (insertError) {
        console.error('Failed to archive: could not write to archives table:', insertError);
        alert('Failed to archive truck — archives storage is not available. Aborting.');
        return;
      }

      await deleteTruck(truckId);
      setTrucks((prev) => prev.filter((t) => t.id !== truckId));
    } catch (error) {
      console.error('Failed to archive truck:', error);
      alert('Failed to archive truck');
    }
  };

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-black">Loading trucks...</p>
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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-black">Truck Management</h1>
          <AddTruckForm
            onTruckAdded={(newTruck) => {
              setTrucks((prev) => [newTruck, ...prev]);
            }}
            trucks={trucks}
            containers={containers}
            stocks={stocks}
          />
        </div>
        {/* Search + Sort Controls */}
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full lg:max-w-md">
              <label className="mb-1 block text-sm font-medium text-gray-700">Search</label>
              <input
                type="text"
                placeholder="Search trucks by name, driver, status..."
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
                  <option value="name">Name</option>
                  <option value="driver">Driver</option>
                  <option value="status">Status</option>
                  <option value="capacity">Capacity</option>
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

        {/* Trucks Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black">
                    Truck Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black">
                    Driver
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black">
                    Capacity
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {displayedTrucks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-black">
                      No trucks found. Add a new truck to get started.
                    </td>
                  </tr>
                ) : (
                  displayedTrucks.map((truck) => (
                    <tr key={truck.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-medium text-black">
                        {truck.name}
                      </td>
                      <td className="px-6 py-4 text-black">
                        {truck.driver_name || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            calculateTruckStatus(truck) === 'Idle'
                              ? 'bg-gray-100 text-gray-800'
                              : calculateTruckStatus(truck) === 'Getting Stocks'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {calculateTruckStatus(truck)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-black">
                        {truck.capacity} units
                      </td>
                      <td className="px-6 py-4 text-black">
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin size={16} className="text-blue-500" />
                          {truck.latitude?.toFixed(4)}, {truck.longitude?.toFixed(4)}
                        </div>
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        <EditTruckForm
                          truck={truck}
                          onTruckUpdated={(updatedTruck) => {
                            setTrucks((prev) =>
                              prev.map((t) => (t.id === updatedTruck.id ? updatedTruck : t))
                            );
                          }}
                        />
                        <button
                          onClick={() => handleArchiveTruck(truck.id)}
                          className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition"
                          title="Archive truck"
                        >
                          <Archive size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteTruck(truck.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete truck"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
