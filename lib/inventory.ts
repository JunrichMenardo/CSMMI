import { supabase } from './supabase';

export interface Inventory {
  id: string;
  total_stock: number;
  used_stock: number;
  created_at: string;
  updated_at: string;
}

// Get current inventory
export const getInventory = async (): Promise<Inventory | null> => {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .single();

  if (error) {
    console.error('Failed to fetch inventory:', error);
    return null;
  }
  return data;
};

// Get available stock (total - used)
export const getAvailableStock = async (): Promise<number> => {
  const inventory = await getInventory();
  if (!inventory) return 0;
  return inventory.total_stock - inventory.used_stock;
};

// Deduct from inventory when adding stocks to containers
export const deductFromInventory = async (quantity: number): Promise<Inventory> => {
  const inventory = await getInventory();
  if (!inventory) throw new Error('Inventory not found');

  const { data, error } = await supabase
    .from('inventory')
    .update({
      used_stock: inventory.used_stock + quantity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', inventory.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to deduct inventory: ${error.message}`);
  }
  return data;
};

// Add back to inventory (when removing stocks from containers)
export const addBackToInventory = async (quantity: number): Promise<Inventory> => {
  const inventory = await getInventory();
  if (!inventory) throw new Error('Inventory not found');

  const newUsedStock = Math.max(0, inventory.used_stock - quantity);

  const { data, error } = await supabase
    .from('inventory')
    .update({
      used_stock: newUsedStock,
      updated_at: new Date().toISOString(),
    })
    .eq('id', inventory.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add back inventory: ${error.message}`);
  }
  return data;
};
