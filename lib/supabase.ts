import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('Supabase environment variables not set, using placeholder.');
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// Create Supabase client with error handling
let supabase: SupabaseClient;
try {
  console.log('Creating Supabase client with URL:', supabaseUrl);
  supabase = createClient(supabaseUrl, supabaseKey);
} catch (error) {
  console.error('Failed to create Supabase client:', error);
  // Create with placeholder if it fails
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
}

export { supabase };

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
