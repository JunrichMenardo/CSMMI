'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Truck } from '@/types';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { AddTruckForm } from '@/components/AddTruckForm';
import { EditTruckForm } from '@/components/EditTruckForm';
import { fetchTrucks, deleteTruck } from '@/lib/api';
import { Trash2, MapPin } from 'lucide-react';

export default function TruckManagementPage() {
  const router = useRouter();
  const [trucks, setTrucks] = useState<Truck[]>([]);
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

  // Load trucks
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadTrucks = async () => {
      try {
        const data = await fetchTrucks();
        setTrucks(data);
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

  const handleDeleteTruck = async (truckId: string) => {
    if (!confirm('Are you sure you want to delete this truck?')) {
      return;
    }

    try {
      await deleteTruck(truckId);
      setTrucks((prev) => prev.filter((t) => t.id !== truckId));
    } catch (error) {
      console.error('Failed to delete truck:', error);
      alert('Failed to delete truck');
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

      <main className="ml-64 px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-black">Truck Management</h1>
          <AddTruckForm
            onTruckAdded={(newTruck) => {
              setTrucks((prev) => [newTruck, ...prev]);
            }}
          />
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
                {trucks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-black">
                      No trucks found. Add a new truck to get started.
                    </td>
                  </tr>
                ) : (
                  trucks.map((truck) => (
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
                            truck.status === 'Active'
                              ? 'bg-green-100 text-green-800'
                              : truck.status === 'Idle'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {truck.status}
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
