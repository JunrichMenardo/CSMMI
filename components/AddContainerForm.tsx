'use client';

import { useState, useEffect } from 'react';
import { Plus, X, ShoppingCart } from 'lucide-react';
import { createContainer, fetchStocks, updateStock, fetchTrucks } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { getUserRole, createManagerRequest, getManagerId } from '@/lib/managerUtils';
import { deductFromInventory } from '@/lib/inventory';
import { Container, Stock, Truck } from '@/types';

interface AddContainerFormProps {
  onContainerAdded: (container: Container) => void;
}

export const AddContainerForm: React.FC<AddContainerFormProps> = ({ onContainerAdded }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [selectedStocks, setSelectedStocks] = useState<Map<string, number>>(new Map());
  const [stockDistributionMode, setStockDistributionMode] = useState<'all' | 'custom'>('all');
  const [customContainerCount, setCustomContainerCount] = useState(1);
  const [formData, setFormData] = useState({
    quantity: 1,
    truck_id: '',
  });

  const loadStocks = async () => {
    try {
      const data = await fetchStocks();
      setStocks(data);
    } catch (err) {
      console.error('Failed to load stocks:', err);
    }
  };

  const loadTrucks = async () => {
    try {
      const data = await fetchTrucks();
      setTrucks(data);
    } catch (err) {
      console.error('Failed to load trucks:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStocks();
      loadTrucks();
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'quantity' ? Math.max(1, parseInt(value) || 1) : value,
    }));
  };

  const generateContainerPrefix = (): string => {
    const timestamp = Date.now().toString().slice(-6);
    return `CNT-${timestamp}`;
  };

  const calculateContainerStatus = (truckId: string | null, hasStocks: boolean): Container['status'] => {
    const hasAssignedTruck = !!truckId;

    // If has truck assigned
    if (hasAssignedTruck) {
      return 'In Transit';
    }
    // If has stocks but no truck
    if (hasStocks) {
      return 'Stored';
    }
    // Empty container, no truck
    return 'Available';
  };

  const handleStockQuantityChange = (stockId: string, quantity: number) => {
    if (quantity > 0) {
      setSelectedStocks((prev) => new Map(prev).set(stockId, quantity));
    } else {
      setSelectedStocks((prev) => {
        const newMap = new Map(prev);
        newMap.delete(stockId);
        return newMap;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Determine how many containers will receive stocks
    const containersToReceiveStocks = stockDistributionMode === 'all' 
      ? formData.quantity 
      : Math.min(customContainerCount, formData.quantity);

    if (stockDistributionMode === 'custom' && customContainerCount > formData.quantity) {
      setError(`Cannot store in ${customContainerCount} containers when only creating ${formData.quantity} containers`);
      setLoading(false);
      return;
    }

    try {
      // Check user role
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setError('You must be logged in');
        setLoading(false);
        return;
      }

      const userRole = await getUserRole(session.user.id);

      const hasStocks = selectedStocks.size > 0;
      const autoStatus = calculateContainerStatus(formData.truck_id || null, hasStocks);

      const containerData = {
        quantity: formData.quantity,
        truck_id: formData.truck_id || null,
        status: autoStatus,
        selectedStocks: Array.from(selectedStocks.entries()).map(([id, qty]) => ({
          stock_id: id,
          quantity: qty,
        })),
        stockDistributionMode,
        customContainerCount,
      };

      // Manager: Create request instead of direct action
      if (userRole === 'manager') {
        const managerId = await getManagerId(session.user.id);
        if (!managerId) {
          setError('Manager account not found');
          setLoading(false);
          return;
        }

        const created = await createManagerRequest(
          managerId,
          'add_container',
          'container',
          containerData
        );

        if (created) {
          setError(null);
          setFormData({
            quantity: 1,
            truck_id: '',
          });
          setSelectedStocks(new Map());
          setStockDistributionMode('all');
          setCustomContainerCount(1);
          setIsOpen(false);
          alert('✅ Request submitted for admin approval!\n\nYour containers will be created after the admin reviews and approves your request.');
          onContainerAdded({} as Container);
        } else {
          setError('Failed to submit request');
        }
        return;
      }

      // Admin: Create containers directly
      const containersCreated: Container[] = [];

      // Create multiple containers based on quantity
      for (let i = 0; i < formData.quantity; i++) {
        const containerNumber = generateContainerPrefix();
        
        const container = await createContainer({
          container_number: containerNumber,
          status: autoStatus,
          origin_location: null,
          destination_location: null,
          truck_id: formData.truck_id || null,
        });
        
        containersCreated.push(container);

        // Add stocks to the container and deduct from central inventory
        if (i < containersToReceiveStocks) {
          let totalQuantityAdded = 0;
          for (const [stockId, quantityToAdd] of selectedStocks.entries()) {
            const stock = stocks.find((s) => s.id === stockId);
            if (stock) {
              // Simply assign the stock to this container
              await updateStock(stockId, {
                container_id: container.id,
              });
              totalQuantityAdded += stock.quantity;
            }
          }
          // Deduct total quantity from central inventory
          if (totalQuantityAdded > 0) {
            await deductFromInventory(totalQuantityAdded);
          }
        }
      }

      if (containersCreated.length > 0) {
        onContainerAdded(containersCreated[0]);
      }
      
      // Reset form
      setFormData({
        quantity: 1,
        truck_id: '',
      });
      setSelectedStocks(new Map());
      setStockDistributionMode('all');
      setCustomContainerCount(1);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add containers');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
      >
        <Plus size={20} />
        Add Container
      </button>

      {isOpen && (
        <>
          {/* Backdrop with transparency */}
          <div
            className="fixed inset-0 bg-black/20 z-40 transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Centered Modal Popup */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
              <div className="sticky top-0 flex items-center justify-between p-6 border-b bg-white rounded-t-xl">
                <h2 className="text-xl font-bold text-black">Add New Container</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700 transition"
                >
                  <X size={24} />
                </button>
              </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-100 text-red-700 p-3 rounded text-sm">
                  {error}
                </div>
              )}

              {/* Container Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-black text-lg">Container Details</h3>
                
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Number of Containers to Create
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    min="1"
                    placeholder="How many containers"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black placeholder-gray-400"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Container numbers will be auto-generated (e.g., CNT-XXXXX)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Assign to Truck (Optional)
                  </label>
                  <select
                    name="truck_id"
                    value={formData.truck_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black"
                  >
                    <option value="">No truck (will be Available/Stored)</option>
                    {trucks.map((truck) => (
                      <option key={truck.id} value={truck.id}>
                        {truck.name} - (Status: {truck.status})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-600 mt-1">
                    Status will be automatically set based on truck assignment and contents
                  </p>
                </div>
              </div>

              {/* Stock Items */}
              <div className="space-y-4">
                <h3 className="font-semibold text-black text-lg flex items-center gap-2">
                  <ShoppingCart size={20} />
                  Add Stock Items
                </h3>

                {/* Stock Distribution Mode */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-blue-900">How to distribute stocks:</p>
                  
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="distribution"
                        value="all"
                        checked={stockDistributionMode === 'all'}
                        onChange={(e) => setStockDistributionMode('all')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-black">
                        Store in ALL {formData.quantity} containers
                      </span>
                    </label>
                    
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="distribution"
                        value="custom"
                        checked={stockDistributionMode === 'custom'}
                        onChange={(e) => setStockDistributionMode('custom')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-black">Store in</span>
                      <input
                        type="number"
                        min="1"
                        max={formData.quantity}
                        value={customContainerCount}
                        onChange={(e) => setCustomContainerCount(Math.max(1, parseInt(e.target.value) || 1))}
                        disabled={stockDistributionMode !== 'custom'}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm bg-white text-black disabled:bg-gray-100"
                      />
                      <span className="text-sm text-black">containers</span>
                    </label>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-3 max-h-96 overflow-y-auto">
                  {stocks.length === 0 ? (
                    <p className="text-black text-sm">No stock items available</p>
                  ) : (
                    stocks.map((stock) => (
                      <div key={stock.id} className="bg-white p-3 rounded border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <label className="font-medium text-black">
                            {stock.item_name}
                          </label>
                          <span className="text-xs text-black">
                            Available: {stock.quantity}
                          </span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max={stock.quantity}
                          placeholder="Qty to add"
                          onChange={(e) =>
                            handleStockQuantityChange(stock.id, parseInt(e.target.value) || 0)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black placeholder-gray-400"
                        />
                        {selectedStocks.has(stock.id) && (
                          <p className="text-xs text-blue-600 mt-1">
                            Adding: {selectedStocks.get(stock.id)} {stock.unit}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 sticky bottom-0 bg-white pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-black rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || formData.quantity < 1}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  {loading ? 'Creating...' : `Create ${formData.quantity} Container${formData.quantity !== 1 ? 's' : ''}`}
                </button>
              </div>
            </form>
            </div>
          </div>
        </>
      )}
    </>
  );
};
