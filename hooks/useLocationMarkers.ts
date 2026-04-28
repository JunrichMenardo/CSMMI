import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface LocationMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  type: 'port' | 'store' | 'plant';
}

const STORAGE_KEY = 'location_markers_v1';

let sharedMarkers: LocationMarker[] | null = null;
let sharedChannel: RealtimeChannel | null = null;
let subscriptionInitialized = false;
const markerListeners = new Set<(markers: LocationMarker[]) => void>();

const persistMarkers = (nextMarkers: LocationMarker[]) => {
  sharedMarkers = nextMarkers;

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextMarkers));
  }

  markerListeners.forEach((listener) => listener(nextMarkers));
};

const ensureLocationMarkerSubscription = () => {
  if (subscriptionInitialized || typeof window === 'undefined') {
    return;
  }

  subscriptionInitialized = true;

  const existingChannels = supabase.getChannels?.() ?? [];
  existingChannels.forEach((channel) => {
    if (channel.topic === 'realtime:location_markers_changes' || channel.topic === 'location_markers_changes') {
      supabase.removeChannel(channel);
    }
  });

  sharedChannel = supabase
    .channel('location_markers_changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'location_markers' },
      (payload: any) => {
        const nextMarker = payload.new as LocationMarker;
        const nextMarkers = [nextMarker, ...(sharedMarkers ?? [])].filter(
          (marker, index, self) => self.findIndex((item) => item.id === marker.id) === index
        );

        console.log('✅ INSERT event received:', nextMarker);
        persistMarkers(nextMarkers);
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'location_markers' },
      (payload: any) => {
        const deletedId = payload.old?.id as string | undefined;
        const nextMarkers = (sharedMarkers ?? []).filter((marker) => marker.id !== deletedId);

        console.log('✅ DELETE event received:', deletedId);
        persistMarkers(nextMarkers);
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'location_markers' },
      (payload: any) => {
        const updatedMarker = payload.new as LocationMarker;
        const nextMarkers = (sharedMarkers ?? []).map((marker) =>
          marker.id === updatedMarker.id ? updatedMarker : marker
        );

        console.log('✅ UPDATE event received:', updatedMarker);
        persistMarkers(nextMarkers);
      }
    )
    .subscribe((status) => {
      console.log('🔔 Location markers subscription status:', status);
    });
};

/**
 * Custom hook for accessing and managing location markers across the entire app
 * Persists markers to localStorage and syncs with database for approval workflow
 */
export const useLocationMarkers = () => {
  const [markers, setMarkers] = useState<LocationMarker[]>(sharedMarkers ?? []);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Load markers from database and localStorage on mount (client-side only)
  useEffect(() => {
    setIsMounted(true);

    if (typeof window === 'undefined') return;

    const loadMarkers = async () => {
      try {
        if (sharedMarkers) {
          console.log('📍 Using shared markers cache:', sharedMarkers);
          setMarkers(sharedMarkers);
          setIsLoading(false);
          return;
        }

        // First try to load from database
        const { data: dbMarkers, error } = await supabase
          .from('location_markers')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && dbMarkers) {
          console.log('📍 Loaded markers from database:', dbMarkers);
          persistMarkers(dbMarkers);
        } else {
          console.log('⚠️ Database fetch error:', error?.message);
          // Fallback to localStorage if database fails
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            console.log('📍 Loaded markers from storage (fallback):', parsed);
            persistMarkers(parsed);
          } else {
            console.log('📍 No markers found');
            persistMarkers([]);
          }
        }
      } catch (error) {
        console.error('❌ Failed to load markers:', error);
        // Final fallback to localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          persistMarkers(parsed);
        } else {
          persistMarkers([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadMarkers();

    markerListeners.add(setMarkers);
    ensureLocationMarkerSubscription();

    if (sharedMarkers) {
      setMarkers(sharedMarkers);
    }

    return () => {
      markerListeners.delete(setMarkers);

      if (markerListeners.size === 0 && sharedChannel) {
        supabase.removeChannel(sharedChannel);
        sharedChannel = null;
        subscriptionInitialized = false;
      }
    };
  }, []);

  // Add a new marker
  const addMarker = async (marker: Omit<LocationMarker, 'id'>) => {
    const fallbackMarker: LocationMarker = {
      ...marker,
      id: `marker-${Math.random().toString(36).substr(2, 9)}`,
    };

    try {
      // Add to database first
      const { data, error } = await supabase
        .from('location_markers')
        .insert([marker])
        .select()
        .single();

      if (error) {
        console.error('Failed to add marker to database:', error);
        // Still add to local state for immediate UI update
        const nextMarkers = [...(sharedMarkers ?? markers), fallbackMarker];
        persistMarkers(nextMarkers);
        return;
      }

      // Use the database response (which has the real ID)
      const dbMarker = data;
      const nextMarkers = [dbMarker, ...(sharedMarkers ?? markers)];
      persistMarkers(nextMarkers);
      console.log('✅ MARKER ADDED TO DB AND LOCAL:', dbMarker);
    } catch (error) {
      console.error('Failed to add marker:', error);
      // Fallback to localStorage only
      const nextMarkers = [...(sharedMarkers ?? markers), fallbackMarker];
      persistMarkers(nextMarkers);
    }
  };

  // Remove a marker
  const removeMarker = async (id: string) => {
    try {
      // Remove from database first
      const { error } = await supabase
        .from('location_markers')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Failed to remove marker from database:', error);
        // Still remove from local state
        const updatedMarkers = (sharedMarkers ?? markers).filter((m) => m.id !== id);
        persistMarkers(updatedMarkers);
        return;
      }

      // Remove from local state
      const updatedMarkers = (sharedMarkers ?? markers).filter((m) => m.id !== id);
      persistMarkers(updatedMarkers);
      console.log('✅ MARKER REMOVED FROM DB AND LOCAL:', id);
    } catch (error) {
      console.error('Failed to remove marker:', error);
      // Fallback to localStorage only
      const updatedMarkers = (sharedMarkers ?? markers).filter((m) => m.id !== id);
      persistMarkers(updatedMarkers);
    }
  };

  // Set all markers (for bulk operations)
  const setAllMarkers = (newMarkers: LocationMarker[]) => {
    setMarkers(newMarkers);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newMarkers));
    }
  };

  // Clear all markers
  const clearMarkers = () => {
    setMarkers([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return {
    markers,
    addMarker,
    removeMarker,
    setAllMarkers,
    clearMarkers,
    isLoading,
    isMounted,
  };
};