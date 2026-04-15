'use client';

import { useState, useEffect } from 'react';
import { Edit, X, Truck as TruckIcon, ShoppingCart, Trash2, Plus, MapPin } from 'lucide-react';
import { updateContainer, fetchTrucks, fetchStocksByContainer, fetchStocks, updateStock, deleteStock } from '@/lib/api';
import { Container, Truck, Stock } from '@/types';
import { OriginLocationMapModal } from './OriginLocationMapModal';

interface EditContainerFormProps {
  container: Container;
  onContainerUpdated: (container: Container) => void;
}

export const EditContainerForm: React.FC<EditContainerFormProps> = ({
  container,
  onContainerUpdated,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isOriginMapOpen, setIsOriginMapOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [allStocks, setAllStocks] = useState<Stock[]>([]);
  const [containerStocks, setContainerStocks] = useState<Stock[]>([]);
  const [stockQuantityChanges, setStockQuantityChanges] = useState<Map<string, number>>(new Map());
  const [newStocksToAdd, setNewStocksToAdd] = useState<Map<string, number>>(new Map());
  const [formData, setFormData] = useState({
    container_number: container.container_number,
    status: container.status,
    origin_location: container.origin_location || '',
    truck_id: container.truck_id || '',
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      await Promise.all([
        loadTrucks(),
        loadStocks(),
        loadContainerStocks(),
      ]);
    } catch (err) {
      console.error('Failed to load data:', err);
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
      await deleteStock(stockId);
      setContainerStocks((prev) => prev.filter((s) => s.id !== stockId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove stock');
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

  // Get available stocks (not already in container)
  const availableStocks = allStocks.filter(
    (stock) => !containerStocks.some((cs) => cs.id === stock.id)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.origin_location) {
      setError('Origin location is required. Please select a location on the map.');
      setLoading(false);
      return;
    }

    try {
      const updatedContainer = await updateContainer(container.id, {
        container_number: formData.container_number,
        status: formData.status,
        origin_location: formData.origin_location,
        destination_location: null,
        truck_id: formData.truck_id || null,
      });

      // Update stock quantities
      for (const [stockId, newQuantity] of stockQuantityChanges.entries()) {
        const stock = containerStocks.find((s) => s.id === stockId);
        if (stock) {
          await updateStock(stockId, {
            quantity: newQuantity,
          });
        }
      }

      // Add new stocks to container
      for (const [stockId, quantityToAdd] of newStocksToAdd.entries()) {
        const stock = allStocks.find((s) => s.id === stockId);
        if (stock) {
          await updateStock(stockId, {
            container_id: container.id,
            quantity: stock.quantity - quantityToAdd,
          });
        }
      }

      console.log('Container updated:', updatedContainer);
      onContainerUpdated(updatedContainer);
      setStockQuantityChanges(new Map());
      setNewStocksToAdd(new Map());
      setIsOpen(false);
      // Reload container stocks to reflect changes
      loadContainerStocks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update container');
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black"
                  >
                    <option value="Available">Available</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Stored">Stored</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Origin Location *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsOriginMapOpen(true)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black hover:bg-gray-50 flex items-center justify-center gap-2 transition font-medium"
                    >
                      <MapPin size={18} />
                      {formData.origin_location ? formData.origin_location : 'Click Map to Select Location'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Truck Assignment */}
              <div className="space-y-4">
                <h3 className="font-semibold text-black text-lg flex items-center gap-2">
                  <TruckIcon size={20} />
                  Assign Truck
                </h3>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Select Truck (Optional)
                  </label>
                  <select
                    name="truck_id"
                    value={formData.truck_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black"
                  >
                    <option value="">-- No Truck Assigned --</option>
                    {trucks.map((truck) => (
                      <option key={truck.id} value={truck.id}>
                        {truck.name} - {truck.driver_name || 'N/A'} ({truck.status})
                      </option>
                    ))}
                  </select>
                </div>

                {formData.truck_id && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      ✓ Container will be assigned to the selected truck
                    </p>
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

          <OriginLocationMapModal
            isOpen={isOriginMapOpen}
            onClose={() => setIsOriginMapOpen(false)}
            onSelectLocation={(city) => setFormData(prev => ({...prev, origin_location: city}))}
            currentLocation={formData.origin_location}
          />
        </>
      )}
    </>
  );
};
