import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Sample trucks with exact coordinates - format: "city|lat|lng"
const sampleTrucks = [
  {
    name: 'Truck Alpha',
    driver_name: 'Juan Dela Cruz',
    status: 'Idle',
    capacity: 1000,
    current_load: 0,
    latitude: 14.5994,
    longitude: 120.9842,
    route_id: null,
    destination_location: 'Cebu|10.3157|123.8854',
  },
  {
    name: 'Truck Beta',
    driver_name: 'Maria Santos',
    status: 'Active',
    capacity: 1500,
    current_load: 750,
    latitude: 10.3157,
    longitude: 123.8854,
    route_id: null,
    destination_location: 'Davao|7.1907|125.4553',
  },
  {
    name: 'Truck Gamma',
    driver_name: 'Carlos Reyes',
    status: 'Idle',
    capacity: 800,
    current_load: 0,
    latitude: 7.1907,
    longitude: 125.4553,
    route_id: null,
    destination_location: 'Manila|14.5994|120.9842',
  },
  {
    name: 'Truck Delta',
    driver_name: 'Anna Garcia',
    status: 'Maintenance',
    capacity: 1200,
    current_load: 0,
    latitude: 14.6349,
    longitude: 121.0388,
    route_id: null,
    destination_location: null,
  },
  {
    name: 'Truck Epsilon',
    driver_name: 'Miguel Lopez',
    status: 'Active',
    capacity: 1100,
    current_load: 500,
    latitude: 10.6918,
    longitude: 122.5637,
    route_id: null,
    destination_location: 'Manila|14.5994|120.9842',
  },
];

export async function POST(request: Request) {
  try {
    // Check for authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.SEED_API_KEY || 'seed-key-123'}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the action from query parameter
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'reset';

    if (action === 'reset') {      // Try to delete all existing trucks by using is not null filter
      try {
        const { error: deleteError } = await supabase
          .from('trucks')
          .delete()
          .is('id', null); // This won't match any, so alternative approach needed
      } catch (e) {
        // Ignore deletion attempt if it fails
      }

      // Alternative: get all IDs and delete them
      const { data: allTrucks } = await supabase
        .from('trucks')
        .select('id');

      if (allTrucks && allTrucks.length > 0) {
        const ids = allTrucks.map(t => t.id);
        for (const id of ids) {
          await supabase.from('trucks').delete().eq('id', id);
        }
      }

      // Insert fresh sample trucks
      const { data, error: insertError } = await supabase
        .from('trucks')
        .insert(sampleTrucks)
        .select();

      if (insertError) {
        return Response.json({ error: insertError.message }, { status: 500 });
      }

      return Response.json({
        success: true,
        message: `Reset database: deleted all trucks and added ${data?.length || 0} new sample trucks with correct coordinates`,
        trucks: data,
      });
    } else if (action === 'add') {
      // Just add sample trucks without deleting
      const { data, error } = await supabase
        .from('trucks')
        .insert(sampleTrucks)
        .select();

      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }

      return Response.json({
        success: true,
        message: `Added ${data?.length || 0} sample trucks`,
        trucks: data,
      });
    } else if (action === 'clear') {
      // Delete all trucks using the same approach
      const { data: allTrucks } = await supabase
        .from('trucks')
        .select('id');

      if (allTrucks && allTrucks.length > 0) {
        const ids = allTrucks.map(t => t.id);
        for (const id of ids) {
          await supabase.from('trucks').delete().eq('id', id);
        }
      }

      return Response.json({
        success: true,
        message: 'All trucks deleted from database',
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
