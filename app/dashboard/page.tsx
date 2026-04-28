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
import dynamic from 'next/dynamic';
import {
  fetchTrucks,
  fetchContainers,
  fetchStocks,
  fetchStocksByContainer,
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
  const [containerStocks, setContainerStocks] = useState<Map<string, Stock[]>>(new Map());
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mapMarkers, setMapMarkers] = useState<Array<{ id: string; lat: number; lng: number; name: string; type: 'port' | 'store' | 'plant' }>>([]);

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

        // Load stocks for all containers
        const stocksMap = new Map<string, Stock[]>();
        for (const container of containersData) {
          try {
            const containerStocksData = await fetchStocksByContainer(container.id);
            stocksMap.set(container.id, containerStocksData);
          } catch (err) {
            console.error(`Failed to load stocks for container ${container.id}:`, err);
            stocksMap.set(container.id, []);
          }
        }
        setContainerStocks(stocksMap);

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

  // Subscribe to containers and stocks updates to keep stats current
  useEffect(() => {
    if (!isAuthenticated) return;

    const containersChannel = supabase.channel('containers-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'containers' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setContainers((prev) => [...prev, payload.new]);
            setContainerStocks((prev) => new Map(prev).set(payload.new.id, []));
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

    const stocksChannel = supabase.channel('stocks-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stocks' },
        async (payload: any) => {
          // Reload stocks for the affected container
          if (payload.new?.container_id || payload.old?.container_id) {
            const containerId = payload.new?.container_id || payload.old?.container_id;
            try {
              const updatedStocks = await fetchStocksByContainer(containerId);
              setContainerStocks((prev) => new Map(prev).set(containerId, updatedStocks));
            } catch (err) {
              console.error(`Failed to reload stocks for container ${containerId}:`, err);
            }
          }
        }
      )
      .subscribe();

    return () => {
      containersChannel.unsubscribe();
      stocksChannel.unsubscribe();
    };
  }, [isAuthenticated]);

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

      <main className="dashboard-main px-4 sm:px-6 lg:px-8 py-8 lg:ml-64">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black">Dashboard</h1>
        </div>

        {/* Stats */}
        <div className="mb-8">
          <DashboardStats
            trucks={trucks}
            containers={containers}
            totalStocks={totalStocks}
            containerStocks={containerStocks}
            stocks={stocks}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Map - spans 2 columns on lg */}
          <div className="lg:col-span-2 h-80 lg:h-screen lg:row-span-2">
            <TruckMap
              trucks={trucks}
              selectedTruckId={selectedTruckId}
              onSelectTruck={setSelectedTruckId}
              onMarkersChange={setMapMarkers}
            />
          </div>

          {/* Truck List */}
          <div className="lg:col-span-2 h-96 overflow-y-auto">
            <TruckList
              trucks={trucks}
              containers={containers}
              stocks={stocks}
              selectedTruckId={selectedTruckId}
              onSelectTruck={setSelectedTruckId}
              loading={loading}
            />
          </div>

          {/* Truck Details */}
          {selectedTruck ? (
            <div className="lg:col-span-2 h-96 overflow-y-auto">
              <TruckDetails 
                truck={selectedTruck}
                onContainerDelivered={(containerId) => {
                  // Refresh containers and stocks to update stats
                  setContainers((prev) =>
                    prev.map((c) =>
                      c.id === containerId ? { ...c, status: 'Delivered' } : c
                    )
                  );
                }}
              />
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
