// Quick seed script to add sample containers
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const sampleContainers = [
  {
    container_number: 'CNT-001',
    truck_id: null,
    status: 'Available' as const,
    origin_location: 'Manila',
    destination_location: null,
  },
  {
    container_number: 'CNT-002',
    truck_id: null,
    status: 'Stored/Available' as const,
    origin_location: 'Cebu',
    destination_location: null,
  },
  {
    container_number: 'CNT-003',
    truck_id: null,
    status: 'Available' as const,
    origin_location: 'Davao',
    destination_location: null,
  },
  {
    container_number: 'CNT-004',
    truck_id: null,
    status: 'Available' as const,
    origin_location: 'Manila',
    destination_location: null,
  },
  {
    container_number: 'CNT-005',
    truck_id: null,
    status: 'Available' as const,
    origin_location: 'Quezon City',
    destination_location: null,
  },
  {
    container_number: 'CNT-006',
    truck_id: null,
    status: 'Stored/Available' as const,
    origin_location: 'Pasay',
    destination_location: null,
  },
  {
    container_number: 'CNT-007',
    truck_id: null,
    status: 'Available' as const,
    origin_location: 'Makati',
    destination_location: null,
  },
  {
    container_number: 'CNT-008',
    truck_id: null,
    status: 'Available' as const,
    origin_location: 'Iloilo',
    destination_location: null,
  },
];

export async function seedContainers() {
  try {
    console.log('🌱 Starting container seeding...');

    const { data, error } = await supabase
      .from('containers')
      .insert(sampleContainers)
      .select();

    if (error) {
      console.error('❌ Error seeding containers:', error);
      throw error;
    }

    console.log(`✅ Successfully added ${data?.length || 0} containers!`);
    return data;
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run if called directly from command line
if (require.main === module) {
  seedContainers().then(() => process.exit(0));
}
