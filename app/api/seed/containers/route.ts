import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const sampleContainers = [
  {
    container_number: 'CNT-001',
    truck_id: null,
    status: 'Available',
    origin_location: 'Manila',
    destination_location: null,
  },
  {
    container_number: 'CNT-002',
    truck_id: null,
    status: 'Available',
    origin_location: 'Cebu',
    destination_location: null,
  },
  {
    container_number: 'CNT-003',
    truck_id: null,
    status: 'Available',
    origin_location: 'Davao',
    destination_location: null,
  },
  {
    container_number: 'CNT-004',
    truck_id: null,
    status: 'In Transit',
    origin_location: 'Manila',
    destination_location: 'Cebu',
  },
  {
    container_number: 'CNT-005',
    truck_id: null,
    status: 'In Transit',
    origin_location: 'Quezon City',
    destination_location: 'Davao',
  },
  {
    container_number: 'CNT-006',
    truck_id: null,
    status: 'Stored',
    origin_location: 'Pasay',
    destination_location: null,
  },
  {
    container_number: 'CNT-007',
    truck_id: null,
    status: 'Available',
    origin_location: 'Makati',
    destination_location: null,
  },
  {
    container_number: 'CNT-008',
    truck_id: null,
    status: 'Available',
    origin_location: 'Iloilo',
    destination_location: null,
  },
];

export async function POST(request: Request) {
  try {
    // Check for authorization header with a simple key
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.SEED_API_KEY || 'seed-key-123'}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('containers')
      .insert(sampleContainers)
      .select();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      message: `Added ${data?.length || 0} containers`,
      containers: data,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
