import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    'Supabase URL or ANON KEY is missing. Please check your .env.local file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Real-time subscription helpers (using Supabase channels)
export const subscribeToTrucks = (callback: (trucks: any[]) => void) => {
  const channel = supabase.channel('trucks')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'trucks' },
      (payload: any) => {
        callback([payload.new]);
      }
    )
    .subscribe();
  
  return channel;
};

export const subscribeToTruckLocation = (
  truckId: string,
  callback: (data: any) => void
) => {
  const channel = supabase.channel(`truck-${truckId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'trucks', filter: `id=eq.${truckId}` },
      (payload: any) => {
        callback(payload.new);
      }
    )
    .subscribe();
  
  return channel;
};

export const subscribeToRoutes = (
  truckId: string,
  callback: (route: any) => void
) => {
  const channel = supabase.channel(`routes-${truckId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'truck_routes', filter: `truck_id=eq.${truckId}` },
      (payload: any) => {
        callback(payload.new);
      }
    )
    .subscribe();
  
  return channel;
};
