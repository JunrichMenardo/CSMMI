// This is a helper script to seed stock data
// Run: node seed-stocks.js

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jzkfgazaincghvbljnrg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6a2ZnYXphaW5jZ2h2YmxqbnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0NTUyMDIsImV4cCI6MjA1OTAzMTIwMn0.NXIuRNShMN0Xr09O18uZqVGK_8Z0yd6kf3PkSzS3FnE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const stockItems = [
  { item_name: 'Electronic Components', quantity: 99999, unit: 'units', weight: 50 },
  { item_name: 'Mechanical Parts', quantity: 99999, unit: 'units', weight: 150 },
  { item_name: 'Electrical Wiring', quantity: 99999, unit: 'meters', weight: 25 },
  { item_name: 'Steel Plates', quantity: 99999, unit: 'pieces', weight: 300 },
  { item_name: 'Plastic Components', quantity: 99999, unit: 'kg', weight: 10 },
  { item_name: 'Rubber Seals', quantity: 99999, unit: 'pieces', weight: 5 },
  { item_name: 'Fasteners', quantity: 99999, unit: 'boxes', weight: 20 },
  { item_name: 'Paint & Coatings', quantity: 99999, unit: 'liters', weight: 30 },
];

async function seedStocks() {
  try {
    console.log('Starting to seed stock data...');
    
    for (const item of stockItems) {
      const { data, error } = await supabase
        .from('stocks')
        .insert([item])
        .select();
      
      if (error) {
        console.error(`Error inserting ${item.item_name}:`, error);
      } else {
        console.log(`✓ Seeded: ${item.item_name}`);
      }
    }
    
    console.log('✓ Stock seeding complete!');
  } catch (error) {
    console.error('Error during seeding:', error);
  }
}

seedStocks();
