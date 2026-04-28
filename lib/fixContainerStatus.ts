/**
 * Fix container statuses to match the automatic logic:
 * - If truck_id assigned → "In Transit"
 * - If has stocks AND no truck → "Stored/Available"
 * - If no stocks AND no truck → "Available"
 */

import { supabase } from './supabase';

export async function fixContainerStatuses() {
  try {
    console.log('🔧 Fixing container statuses...');

    // Get all containers
    const { data: containers, error: containerError } = await supabase
      .from('containers')
      .select('*');

    if (containerError) throw containerError;

    if (!containers || containers.length === 0) {
      console.log('✅ No containers to fix');
      return;
    }

    // Get all stocks
    const { data: stocks, error: stockError } = await supabase
      .from('stocks')
      .select('container_id');

    if (stockError) throw stockError;

    // Create a set of container IDs that have stocks
    const containerIdsWithStocks = new Set(
      stocks?.map((stock) => stock.container_id).filter(Boolean) || []
    );

    // Determine new status for each container
    const updates: Array<{ id: string; status: string }> = [];

    for (const container of containers) {
      let newStatus = 'Available';

      if (container.truck_id) {
        // Has truck assigned → In Transit
        newStatus = 'In Transit';
      } else if (containerIdsWithStocks.has(container.id)) {
        // No truck but has stocks → Stored/Available
        newStatus = 'Stored/Available';
      }

      // Only update if status changed
      if (container.status !== newStatus) {
        updates.push({ id: container.id, status: newStatus });
        console.log(
          `${container.container_number}: ${container.status} → ${newStatus}`
        );
      }
    }

    // Apply updates
    if (updates.length > 0) {
      const { error: updateError } = await supabase
        .from('containers')
        .upsert(
          updates.map((u) => ({
            id: u.id,
            status: u.status,
          }))
        );

      if (updateError) throw updateError;
      console.log(`✅ Updated ${updates.length} containers`);
    } else {
      console.log('✅ All containers have correct status');
    }
  } catch (error) {
    console.error('❌ Error fixing container statuses:', error);
    throw error;
  }
}
