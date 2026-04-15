// Custom hooks for the application

import { useMapStore } from '@/lib/store';
import { Truck, Container, Stock, TruckRoute } from '@/types';
import { useCallback } from 'react';
import React from 'react';

/**
 * Hook for managing truck map state
 * Provides easy access to map store operations
 */
export const useMapState = () => {
  const store = useMapStore();

  const selectTruck = useCallback(
    (truckId: string | null) => {
      store.setSelectedTruck(truckId);
    },
    [store]
  );

  const updateTruck = useCallback(
    (truck: Truck) => {
      store.updateTruck(truck);
    },
    [store]
  );

  const addRoutePoint = useCallback(
    (truckId: string, route: TruckRoute) => {
      store.addRoute(truckId, route);
    },
    [store]
  );

  return {
    trucks: store.trucks,
    selectedTruckId: store.selectedTruckId,
    routes: store.routes,
    loading: store.loading,
    error: store.error,
    selectTruck,
    updateTruck,
    addRoutePoint,
  };
};

/**
 * Hook for managing API loading states
 * Useful for handling loading/error states in components
 */
export const useAsyncOperation = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const execute = useCallback(
    async <T,>(operation: () => Promise<T>): Promise<T | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await operation();
        return result;
      } catch (err: any) {
        const errorMessage = err.message || 'An error occurred';
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { isLoading, error, execute };
};
