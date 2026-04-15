import { create } from 'zustand';
import { MapState, Truck, TruckRoute } from '@/types';

interface MapStore extends MapState {
  setTrucks: (trucks: Truck[]) => void;
  addTruck: (truck: Truck) => void;
  updateTruck: (truck: Truck) => void;
  setSelectedTruck: (truckId: string | null) => void;
  addRoute: (truckId: string, route: TruckRoute) => void;
  setRoutes: (truckId: string, routes: TruckRoute[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useMapStore = create<MapStore>((set: any) => ({
  trucks: [],
  selectedTruckId: null,
  routes: {},
  loading: false,
  error: null,

  setTrucks: (trucks: Truck[]) => set({ trucks }),
  addTruck: (truck: Truck) =>
    set((state: MapState) => ({
      trucks: [...state.trucks, truck],
    })),
  updateTruck: (updatedTruck: Truck) =>
    set((state: MapState) => ({
      trucks: state.trucks.map((truck: Truck) =>
        truck.id === updatedTruck.id ? updatedTruck : truck
      ),
    })),
  setSelectedTruck: (truckId: string | null) => set({ selectedTruckId: truckId }),
  addRoute: (truckId: string, route: TruckRoute) =>
    set((state: MapState) => ({
      routes: {
        ...state.routes,
        [truckId]: [...(state.routes[truckId] || []), route],
      },
    })),
  setRoutes: (truckId: string, routes: TruckRoute[]) =>
    set((state: MapState) => ({
      routes: { ...state.routes, [truckId]: routes },
    })),
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
}));
