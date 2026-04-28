'use client';

import { useState, useEffect } from 'react';
import { Edit, X, Truck as TruckIcon, ShoppingCart, Trash2, Plus } from 'lucide-react';
import { updateContainer, fetchTrucks, fetchStocksByContainer, fetchStocks, updateStock, deleteStock, deleteContainer } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { getUserRole, createManagerRequest, getManagerId } from '@/lib/managerUtils';
import { deductFromInventory, addBackToInventory } from '@/lib/inventory';
import { Container, Truck, Stock } from '@/types';
import { Toast } from './Toast';

interface EditContainerFormProps {
  container: Container;
  onContainerUpdated: (container: Container) => void;
}

interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export const EditContainerForm: React.FC<EditContainerFormProps> = ({
  container,
  onContainerUpdated,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [allStocks, setAllStocks] = useState<Stock[]>([]);
  const [containerStocks, setContainerStocks] = useState<Stock[]>([]);
  const [stockQuantityChanges, setStockQuantityChanges] = useState<Map<string, number>>(new Map());
  const [newStocksToAdd, setNewStocksToAdd] = useState<Map<string, number>>(new Map());
  const [formData, setFormData] = useState({
    container_number: container.container_number,
    truck_id: container.truck_id || '',
  });
  const [isEditingTruck, setIsEditingTruck] = useState(false);

  // Reset form data when container changes or modal opens
  useEffect(() => {
    setFormData({
      container_number: container.container_number,
      truck_id: container.truck_id || '',
    });
    setIsEditingTruck(false);
  }, [container, isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadData = async () => {
    try {
      await Promise.all([
        loadTrucks(),
        loadStocks(),
        loadContainerStocks(),
      ]);
    } catch (err) {
      console.error('Failed to load data:', err);
      addToast('Failed to load data', 'error');
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

  const loadStocks = async () => {
    try {
      const data = await fetchStocks();
      setAllStocks(data);
    } catch (err) {
      console.error('Failed to load stocks:', err);
    }
  };

  const loadContainerStocks = async () => {
    try {
      const data = await fetchStocksByContainer(container.id);
      setContainerStocks(data);
    } catch (err) {
      console.error('Failed to load container stocks:', err);
    }
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleStockQuantityChange = (stockId: string, newQuantity: number) => {
    setStockQuantityChanges((prev) => {
      const newMap = new Map(prev);
      if (newQuantity > 0) {
        newMap.set(stockId, newQuantity);
      } else {
        newMap.delete(stockId);
      }
      return newMap;
    });
  };

  const handleRemoveStock = async (stockId: string) => {
    try {
      const stock = containerStocks.find((s) => s.id === stockId);
      
      // Delete the stock
      await deleteStock(stockId);
      
      // Add back the quantity to central inventory
      if (stock) {
        await addBackToInventory(stock.quantity);
      }
      
      setContainerStocks((prev) => prev.filter((s) => s.id !== stockId));
      addToast('Stock item removed and inventory updated', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to remove stock', 'error');
    }
  };

  const handleAddNewStock = (stockId: string, quantity: number) => {
    if (quantity > 0) {
      setNewStocksToAdd((prev) => new Map(prev).set(stockId, quantity));
    } else {
      setNewStocksToAdd((prev) => {
        const newMap = new Map(prev);
        newMap.delete(stockId);
        return newMap;
      });
    }
  };

  // Get available stocks (not already in this container)
  const availableStocks = allStocks.filter(
    (stock) => !containerStocks.some((cs) => cs.id === stock.id)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check user role
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        addToast('You must be logged in', 'error');
        setLoading(false);
        return;
      }

      const userRole = await getUserRole(session.user.id);

      const autoStatus = calculateContainerStatus(formData.truck_id || null, containerStocks.length > 0);
      
      const updatedData = {
        container_number: formData.container_number,
        status: autoStatus,
        origin_location: container.origin_location,
        destination_location: null,
        truck_id: formData.truck_id || null,
        stockQuantityChanges: Array.from(stockQuantityChanges.entries()),
        newStocksToAdd: Array.from(newStocksToAdd.entries()),
      };

      // Manager: Create request instead of direct action
      if (userRole === 'manager') {
        const managerId = await getManagerId(session.user.id);
        if (!managerId) {
          addToast('Manager account not found', 'error');
          setLoading(false);
          return;
        }

        const created = await createManagerRequest(
          managerId,
          'edit_container',
          'container',
          updatedData,
          container.id
        );

        if (created) {
          addToast('✅ Edit request submitted for admin approval!', 'success');
          setStockQuantityChanges(new Map());
          setNewStocksToAdd(new Map());
          setIsOpen(false);
        } else {
          addToast('Failed to submit request', 'error');
        }
        return;
      }

      // Admin: Update container directly
      const updatedContainer = await updateContainer(container.id, {
        container_number: formData.container_number,
        status: autoStatus,
        origin_location: container.origin_location,
        destination_location: null,
        truck_id: formData.truck_id || null,
      });

      // Update stock quantities and adjust inventory
      for (const [stockId, newQuantity] of stockQuantityChanges.entries()) {
        const stock = containerStocks.find((s) => s.id === stockId);
        if (stock) {
          const oldQuantity = stock.quantity;
          const difference = newQuantity - oldQuantity;

          // Update the stock quantity
          await updateStock(stockId, {
            quantity: newQuantity,
          });

          // Adjust central inventory based on difference
          if (difference > 0) {
            // Quantity increased - deduct more from inventory
            await deductFromInventory(difference);
          } else if (difference < 0) {
            // Quantity decreased - add back to inventory
            await addBackToInventory(Math.abs(difference));
          }
        }
      }

      // Add new stocks to container
      // When adding stocks, assign them to the container and deduct from central inventory
      let totalQuantityAdded = 0;
      for (const [stockId, quantityToAdd] of newStocksToAdd.entries()) {
        const stock = allStocks.find((s) => s.id === stockId);
        if (stock) {
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

      console.log('Container updated:', updatedContainer);
      addToast('Container updated successfully! ✓', 'success');
      onContainerUpdated(updatedContainer);
      setStockQuantityChanges(new Map());
      setNewStocksToAdd(new Map());
      setIsOpen(false);
      // Reload container stocks to reflect changes
      loadContainerStocks();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update container';
      console.error('Update error:', err);
      addToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Toasts */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}

      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
      >
        <Edit size={20} />
        Edit Container
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
                <h2 className="text-xl font-bold text-black">Edit Container</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700 transition"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">

              {/* Container Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-black text-lg">Container Details</h3>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Container Number
                  </label>
                  <input
                    type="text"
                    name="container_number"
                    value={formData.container_number}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Status will be automatically calculated based on truck assignment and stock contents.
                  </p>
                </div>
              </div>

              {/* Truck Assignment */}
              <div className="space-y-4">
                <h3 className="font-semibold text-black text-lg flex items-center gap-2">
                  <TruckIcon size={20} />
                  Truck Assignment
                </h3>

                {!isEditingTruck && formData.truck_id ? (
                  // Show current assignment
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-black mb-2">
                      Currently Assigned To:
                    </p>
                    <p className="text-black font-semibold mb-3">
                      {trucks.find((t) => t.id === formData.truck_id)?.name || 'Unknown Truck'}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingTruck(true)}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                      >
                        Change Truck
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, truck_id: '' }));
                          setIsEditingTruck(false);
                        }}
                        className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition"
                      >
                        Remove Assignment
                      </button>
                    </div>
                  </div>
                ) : !isEditingTruck ? (
                  // Show option to assign
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-600 mb-3">No truck assigned to this container</p>
                    <button
                      type="button"
                      onClick={() => setIsEditingTruck(true)}
                      className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                    >
                      Assign a Truck
                    </button>
                  </div>
                ) : (
                  // Show selection mode
                  <div className="space-y-3">
                    <select
                      name="truck_id"
                      value={formData.truck_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black"
                    >
                      <option value="">-- No Truck --</option>
                      {trucks.map((truck) => (
                        <option key={truck.id} value={truck.id}>
                          {truck.name} - {truck.driver_name || 'N/A'} ({truck.status})
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!formData.truck_id) {
                            setIsEditingTruck(false);
                          } else {
                            setIsEditingTruck(false);
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-gray-300 text-black text-sm rounded-lg hover:bg-gray-400 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingTruck(false)}
                        className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Stock Items */}
              <div className="space-y-4">
                <h3 className="font-semibold text-black text-lg flex items-center gap-2">
                  <ShoppingCart size={20} />
                  Container Stocks
                </h3>

                {containerStocks.length === 0 ? (
                  <p className="text-black text-sm">No stocks in this container</p>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3 max-h-96 overflow-y-auto">
                    {containerStocks.map((stock) => (
                      <div key={stock.id} className="bg-white p-3 rounded border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <label className="font-medium text-black">
                            {stock.item_name}
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveStock(stock.id)}
                            className="text-red-600 hover:text-red-700 transition"
                            title="Remove stock from container"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-600">Current: {stock.quantity}</label>
                            <input
                              type="number"
                              min="0"
                              defaultValue={stock.quantity}
                              onChange={(e) =>
                                handleStockQuantityChange(stock.id, parseInt(e.target.value) || 0)
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black"
                              placeholder="New quantity"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Unit: {stock.unit}</label>
                            {stock.expiry_date && (
                              <p className="text-xs text-gray-500 mt-1">Exp: {new Date(stock.expiry_date).toLocaleDateString()}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Stocks */}
              <div className="space-y-4">
                <h3 className="font-semibold text-black text-lg flex items-center gap-2">
                  <Plus size={20} />
                  Add More Stocks
                </h3>

                {availableStocks.length === 0 ? (
                  <p className="text-black text-sm">All available stocks are already in this container</p>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3 max-h-96 overflow-y-auto">
                    {availableStocks.map((stock) => (
                      <div key={stock.id} className="bg-white p-3 rounded border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <label className="font-medium text-black">
                            {stock.item_name}
                          </label>
                          <span className="text-xs text-gray-600">Available: {stock.quantity}</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max={stock.quantity}
                          placeholder="Qty to add"
                          onChange={(e) =>
                            handleAddNewStock(stock.id, parseInt(e.target.value) || 0)
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black placeholder-gray-400"
                        />
                        {newStocksToAdd.has(stock.id) && (
                          <p className="text-xs text-blue-600 mt-1">
                            Adding: {newStocksToAdd.get(stock.id)} {stock.unit}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  {loading ? 'Updating...' : 'Update Container'}
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
