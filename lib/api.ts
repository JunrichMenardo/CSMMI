import { supabase } from './supabase';
import { Truck, Container, Stock, TruckRoute } from '@/types';

// Truck operations
export const fetchTrucks = async (): Promise<Truck[]> => {
  const { data, error } = await supabase
    .from('trucks')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const fetchTruckById = async (id: string): Promise<Truck | null> => {
  const { data, error } = await supabase
    .from('trucks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const createTruck = async (truck: Omit<Truck, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('trucks')
    .insert([truck])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateTruckLocation = async (
  id: string,
  latitude: number,
  longitude: number
) => {
  const { data, error } = await supabase
    .from('trucks')
    .update({ latitude, longitude, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateTruckStatus = async (id: string, status: string) => {
  const { data, error } = await supabase
    .from('trucks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateTruck = async (
  id: string,
  updates: {
    name?: string;
    driver_name?: string;
    status?: 'Active' | 'Idle' | 'Maintenance';
    latitude?: number;
    longitude?: number;
    capacity?: number;
    current_load?: number;
    route_id?: string | null;
    destination_location?: string | null;
  }
) => {
  const { data, error } = await supabase
    .from('trucks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteTruck = async (id: string) => {
  const { error } = await supabase.from('trucks').delete().eq('id', id);
  if (error) throw error;
};

// Truck Route operations
export const fetchTruckRoutes = async (truckId: string): Promise<TruckRoute[]> => {
  const { data, error } = await supabase
    .from('truck_routes')
    .select('*')
    .eq('truck_id', truckId)
    .order('waypoint_order', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const addTruckRoute = async (
  truckId: string,
  latitude: number,
  longitude: number,
  order?: number
) => {
  const { data, error } = await supabase
    .from('truck_routes')
    .insert([
      {
        truck_id: truckId,
        waypoint_lat: latitude,
        waypoint_lng: longitude,
        waypoint_order: order ?? 0,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Container operations
export const fetchContainers = async (): Promise<Container[]> => {
  const { data, error } = await supabase
    .from('containers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const fetchContainersByTruck = async (truckId: string): Promise<Container[]> => {
  const { data, error } = await supabase
    .from('containers')
    .select('*')
    .eq('truck_id', truckId);

  if (error) throw error;
  return data || [];
};

export const createContainer = async (
  container: Omit<Container, 'id' | 'created_at' | 'updated_at'>
) => {
  const { data, error } = await supabase
    .from('containers')
    .insert([container])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateContainer = async (
  id: string,
  updates: Partial<Container>
) => {
  const { data, error } = await supabase
    .from('containers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteContainer = async (id: string) => {
  const { error } = await supabase.from('containers').delete().eq('id', id);
  if (error) throw error;
};

export const markContainerAsDelivered = async (containerId: string) => {
  const { data, error } = await supabase
    .from('containers')
    .update({ status: 'Delivered', updated_at: new Date().toISOString() })
    .eq('id', containerId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Stock operations
export const fetchStocks = async (): Promise<Stock[]> => {
  const { data, error } = await supabase
    .from('stocks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const fetchStocksByContainer = async (
  containerId: string
): Promise<Stock[]> => {
  const { data, error } = await supabase
    .from('stocks')
    .select('*')
    .eq('container_id', containerId);

  if (error) throw error;
  return data || [];
};

export const addStock = async (
  stock: Omit<Stock, 'id' | 'created_at' | 'updated_at'>
) => {
  const { data, error } = await supabase
    .from('stocks')
    .insert([stock])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateStock = async (id: string, updates: Partial<Stock>) => {
  const { data, error } = await supabase
    .from('stocks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteStock = async (id: string) => {
  const { error } = await supabase.from('stocks').delete().eq('id', id);
  if (error) throw error;
};

// Route generation for container assignments
export const createRouteToDestination = async (
  truckId: string,
  destinationLat: number,
  destinationLng: number,
  destinationName: string
) => {
  try {
    // Get truck current location
    const truck = await fetchTruckById(truckId);
    if (!truck) throw new Error('Truck not found');

    // Create waypoint at destination
    await addTruckRoute(truckId, destinationLat, destinationLng, 1);

    return { success: true, message: `Route created to ${destinationName}` };
  } catch (error) {
    console.error('Failed to create route:', error);
    throw error;
  }
};

// Auto-update truck location towards destination
export const autoMoveTruckToDestination = async (
  truckId: string,
  destinationLat: number,
  destinationLng: number
) => {
  try {
    const truck = await fetchTruckById(truckId);
    if (!truck) throw new Error('Truck not found');

    // Calculate step size for gradual movement (adjust as needed)
    const steps = 20;
    const currentLat = truck.latitude;
    const currentLng = truck.longitude;

    const latDiff = destinationLat - currentLat;
    const lngDiff = destinationLng - currentLng;

    const latStep = latDiff / steps;
    const lngStep = lngDiff / steps;

    let currentStep = 0;

    // Auto-update truck location every 3 seconds
    const interval = setInterval(async () => {
      try {
        if (currentStep >= steps) {
          // Reached destination
          await updateTruckLocation(truckId, destinationLat, destinationLng);
          await updateTruckStatus(truckId, 'Idle');
          clearInterval(interval);
          console.log(`Truck ${truckId} reached destination`);
          return;
        }

        currentStep++;
        const newLat = currentLat + latStep * currentStep;
        const newLng = currentLng + lngStep * currentStep;

        await updateTruckLocation(truckId, newLat, newLng);
        console.log(`Truck ${truckId} moving: [${newLat.toFixed(4)}, ${newLng.toFixed(4)}]`);
      } catch (stepError) {
        console.error(`Error during truck movement step for ${truckId}:`, stepError);
        clearInterval(interval);
      }
    }, 3000);

    console.log(`Started auto-movement for truck ${truckId} to [${destinationLat}, ${destinationLng}]`);
    return { success: true, message: 'Truck started moving to destination' };
  } catch (error) {
    console.error('Failed to auto-move truck:', error);
    throw error;
  }
};
