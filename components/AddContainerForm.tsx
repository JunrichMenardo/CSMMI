'use client';

import { useState, useEffect } from 'react';
import { Plus, X, ShoppingCart, MapPin } from 'lucide-react';
import { createContainer, fetchStocks, updateStock, fetchTrucks } from '@/lib/api';
import { Container, Stock, Truck } from '@/types';
import { OriginLocationMapModal } from './OriginLocationMapModal';

interface AddContainerFormProps {
  onContainerAdded: (container: Container) => void;
}

export const AddContainerForm: React.FC<AddContainerFormProps> = ({ onContainerAdded }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isOriginMapOpen, setIsOriginMapOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [selectedStocks, setSelectedStocks] = useState<Map<string, number>>(new Map());
  const [formData, setFormData] = useState({
    container_number: '',
    status: 'Available' as const,
    origin_location: '',
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
      [name]: value,
    }));
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

    if (!formData.origin_location) {
      setError('Origin location is required. Please select a location on the map.');
      setLoading(false);
      return;
    }

    try {
      // Create container
      const container = await createContainer({
        container_number: formData.container_number,
        status: formData.status,
        origin_location: formData.origin_location,
        destination_location: null,
        truck_id: formData.truck_id || null,
      });

      // Add stocks to container and reduce stock quantities
      for (const [stockId, quantity] of selectedStocks.entries()) {
        const stock = stocks.find((s) => s.id === stockId);
        if (stock) {
          // Update stock to add container_id and reduce quantity
          await updateStock(stockId, {
            container_id: container.id,
            quantity: stock.quantity - quantity,
          });
        }
      }

      onContainerAdded(container);
      
      // Reset form
      setFormData({
        container_number: '',
        status: 'Available',
        origin_location: '',
        truck_id: '',
      });
      setSelectedStocks(new Map());
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add container');
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
                    Container Number
                  </label>
                  <input
                    type="text"
                    name="container_number"
                    value={formData.container_number}
                    onChange={handleChange}
                    placeholder="e.g., CNT-001"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black placeholder-gray-400"
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
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Assign to Truck
                    </label>
                    <select
                      name="truck_id"
                      value={formData.truck_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black"
                    >
                      <option value="">Select truck (optional)</option>
                      {trucks.map((truck) => (
                        <option key={truck.id} value={truck.id}>
                          {truck.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Stock Items */}
              <div className="space-y-4">
                <h3 className="font-semibold text-black text-lg flex items-center gap-2">
                  <ShoppingCart size={20} />
                  Add Stock Items
                </h3>

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
                  disabled={loading || formData.container_number === ''}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  {loading ? 'Creating...' : 'Create Container'}
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
