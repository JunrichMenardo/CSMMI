'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Truck, Container, Stock } from '@/types';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { DashboardStats } from '@/components/DashboardStats';
import { TruckList } from '@/components/TruckList';
import { TruckDetails } from '@/components/TruckDetails';
import { AddTruckForm } from '@/components/AddTruckForm';
import dynamic from 'next/dynamic';
import {
  fetchTrucks,
  fetchContainers,
  fetchStocks,
  fetchTruckRoutes,
  addTruckRoute,
} from '@/lib/api';
import { useMapStore } from '@/lib/store';

// Dynamically import map component to avoid SSR issues
const TruckMap = dynamic(() => import('@/components/TruckMap'), {
  ssr: false,
  loading: () => <div className="bg-gray-200 rounded-lg h-full flex items-center justify-center">Loading map...</div>,
});

export default function DashboardPage() {
  const router = useRouter();
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
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

  // Load initial data
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      try {
        const [trucksData, containersData, stocksData] = await Promise.all([
          fetchTrucks(),
          fetchContainers(),
          fetchStocks(),
        ]);

        setTrucks(trucksData);
        setContainers(containersData);
        setStocks(stocksData);

        // Automatically select the first truck
        if (trucksData.length > 0) {
          setSelectedTruckId(trucksData[0].id);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated]);

  // Subscribe to real-time updates for trucks
  useEffect(() => {
    if (!isAuthenticated) return;

    const channel = supabase.channel('trucks-real-time')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'trucks' },
        (payload: any) => {
          setTrucks((prev) => [...prev, payload.new]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trucks' },
        (payload: any) => {
          setTrucks((prev) =>
            prev.map((t) => (t.id === payload.new.id ? payload.new : t))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'trucks' },
        (payload: any) => {
          setTrucks((prev) => prev.filter((t) => t.id !== payload.old.id));
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log('Real-time truck updates connected');
        }
      });

    // Also poll for updates every 2 seconds as a fallback to ensure live updates
    const pollInterval = setInterval(async () => {
      try {
        const updatedTrucks = await fetchTrucks();
        setTrucks(updatedTrucks);
      } catch (err) {
        // Silently fail - real-time subscription should be the primary method
      }
    }, 2000);

    return () => {
      channel.unsubscribe();
      clearInterval(pollInterval);
    };
  }, [isAuthenticated]);

  // Handle truck selection - auto-select first truck if selected one is deleted
  useEffect(() => {
    if (trucks.length === 0) {
      setSelectedTruckId(null);
    } else if (!selectedTruckId || !trucks.find((t) => t.id === selectedTruckId)) {
      // If no truck is selected or selected truck was deleted, select the first one
      setSelectedTruckId(trucks[0].id);
    }
  }, [trucks]);

  // Subscribe to truck routes updates
  useEffect(() => {
    if (!selectedTruckId || !isAuthenticated) return;

    const channel = supabase.channel(`routes-${selectedTruckId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'truck_routes', filter: `truck_id=eq.${selectedTruckId}` },
        (payload: any) => {
          // Trigger route refresh
          fetchTruckRoutes(selectedTruckId).then((routes) => {
            useMapStore.setState((state: any) => ({
              routes: { ...state.routes, [selectedTruckId]: routes },
            }));
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [selectedTruckId, isAuthenticated]);

  const selectedTruck = trucks.find((t) => t.id === selectedTruckId);
  const totalStocks = stocks.reduce((sum, stock) => sum + stock.quantity, 0);

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-black">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      <Header />

      <main className="ml-64 px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Add Truck Button */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-black">Dashboard</h1>
          <AddTruckForm
            onTruckAdded={(newTruck) => {
              setTrucks((prev) => [newTruck, ...prev]);
              // Auto-select new truck if none is selected
              if (!selectedTruckId) {
                setSelectedTruckId(newTruck.id);
              }
            }}
          />
        </div>

        {/* Stats */}
        <div className="mb-8">
          <DashboardStats
            trucks={trucks}
            containers={containers}
            totalStocks={totalStocks}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Map - spans 2 columns on lg */}
          <div className="lg:col-span-2 h-screen lg:row-span-2">
            <TruckMap
              trucks={trucks}
              selectedTruckId={selectedTruckId}
              onSelectTruck={setSelectedTruckId}
            />
          </div>

          {/* Truck List */}
          <div className="lg:col-span-2 h-96 overflow-y-auto">
            <TruckList
              trucks={trucks}
              selectedTruckId={selectedTruckId}
              onSelectTruck={setSelectedTruckId}
              loading={loading}
            />
          </div>

          {/* Truck Details */}
          {selectedTruck ? (
            <div className="lg:col-span-2 h-96 overflow-y-auto">
              <TruckDetails truck={selectedTruck} />
            </div>
          ) : (
            <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6 flex items-center justify-center h-96">
              <p className="text-black text-center">
                Select a truck to view details
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
