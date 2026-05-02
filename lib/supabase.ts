import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const resilientFetch: typeof fetch = async (input, init) => {
  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await fetch(input, init);
    } catch (error) {
      const isNetworkFailure =
        error instanceof TypeError ||
        (error instanceof Error && error.name === 'AbortError');

      if (!isNetworkFailure || attempt === maxRetries) {
        throw error;
      }

      // Brief backoff helps with temporary network hiccups.
      await sleep(300 * (attempt + 1));
    }
  }

  throw new Error('Request failed after retries');
};

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('Supabase environment variables not set, using placeholder.');
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// Create Supabase client with error handling
declare global {
  // eslint-disable-next-line no-var
  var __csmmiSupabaseClient: SupabaseClient | undefined;
  interface Window {
    __csmmiSupabaseClient?: SupabaseClient;
  }
}

const createSupabaseClient = () => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Creating Supabase client with URL:', supabaseUrl);
    }
    return createClient(supabaseUrl, supabaseKey, {
      global: {
        fetch: resilientFetch,
      },
    });
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    return createClient('https://placeholder.supabase.co', 'placeholder-key', {
      global: {
        fetch: resilientFetch,
      },
    });
  }
};

const getSingletonClient = () => {
  if (typeof window !== 'undefined') {
    if (!window.__csmmiSupabaseClient) {
      window.__csmmiSupabaseClient = createSupabaseClient();
    }
    return window.__csmmiSupabaseClient;
  }

  if (!globalThis.__csmmiSupabaseClient) {
    globalThis.__csmmiSupabaseClient = createSupabaseClient();
  }
  return globalThis.__csmmiSupabaseClient;
};

const supabase = getSingletonClient();

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
