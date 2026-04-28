'use client';

import { useEffect, useState } from 'react';
import { Truck, Container, Stock } from '@/types';
import { fetchContainersByTruck, fetchStocksByContainer, markContainerAsDelivered, updateStock } from '@/lib/api';
import { MapPin, Truck as TruckIcon, AlertCircle, CheckCircle, Package, Edit2, X } from 'lucide-react';
import { format } from 'date-fns';
import { Toast } from './Toast';

interface TruckDetailsProps {
  truck: Truck;
  onContainerDelivered?: (containerId: string) => void;
}

interface ContainerWithStocks extends Container {
  stocks: Stock[];
  totalItems: number;
}

interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export const TruckDetails: React.FC<TruckDetailsProps> = ({ truck, onContainerDelivered }) => {
  const [containers, setContainers] = useState<ContainerWithStocks[]>([]);
  const [loading, setLoading] = useState(true);
  const [deliveringContainerId, setDeliveringContainerId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Stock>>({});

  useEffect(() => {
    const loadContainers = async () => {
      try {
        const containersData = await fetchContainersByTruck(truck.id);
        
        // Load stocks for each container and calculate totals
        const containersWithStocks = await Promise.all(
          containersData.map(async (container) => {
            try {
              const stocks = await fetchStocksByContainer(container.id);
              const totalItems = stocks.reduce((sum, stock) => sum + stock.quantity, 0);
              return {
                ...container,
                stocks,
                totalItems,
              };
            } catch (err) {
              console.error(`Failed to load stocks for container ${container.id}:`, err);
              return {
                ...container,
                stocks: [],
                totalItems: 0,
              };
            }
          })
        );
        
        setContainers(containersWithStocks);
      } catch (err) {
        console.error('Failed to load containers:', err);
      } finally {
        setLoading(false);
      }
    };

    loadContainers();
  }, [truck.id]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleMarkAsDelivered = async (containerId: string) => {
    try {
      setDeliveringContainerId(containerId);
      await markContainerAsDelivered(containerId);
      
      // Update local state
      setContainers((prev) =>
        prev.map((c) =>
          c.id === containerId ? { ...c, status: 'Delivered' } : c
        )
      );
      
      addToast('Container marked as delivered! ✓', 'success');
      
      // Notify parent component
      if (onContainerDelivered) {
        onContainerDelivered(containerId);
      }
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to mark container as delivered', 'error');
    } finally {
      setDeliveringContainerId(null);
    }
  };

  const handleEditStock = (stock: Stock) => {
    setEditingStock(stock);
    setEditFormData(stock);
  };

  const handleSaveEdit = async () => {
    if (!editingStock) return;

    try {
      const updates: Partial<Stock> = {
        quantity: editFormData.quantity || editingStock.quantity,
        description: editFormData.description || editingStock.description,
      };

      const updatedStock = await updateStock(editingStock.id, updates);

      // Update local containers state
      setContainers((prev) =>
        prev.map((container) => ({
          ...container,
          stocks: container.stocks.map((s) =>
            s.id === editingStock.id ? { ...s, ...updates } : s
          ),
          totalItems: container.stocks.reduce(
            (sum, s) => sum + (s.id === editingStock.id ? (updates.quantity || s.quantity) : s.quantity),
            0
          ),
        }))
      );

      addToast('Stock item updated successfully! ✓', 'success');
      setEditingStock(null);
      setEditFormData({});
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to update stock', 'error');
    }
  };

  const statusColors: Record<string, string> = {
    Idle: 'bg-gray-100 text-gray-800',
    Delivering: 'bg-blue-100 text-blue-800',
    Returning: 'bg-orange-100 text-orange-800',
  };

  const containerStatusColors: Record<string, string> = {
    Available: 'bg-gray-100 text-gray-800',
    'In Transit': 'bg-yellow-100 text-yellow-800',
    Stored: 'bg-blue-100 text-blue-800',
    Delivered: 'bg-green-100 text-green-800',
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

      <div className="bg-white rounded-lg shadow-lg p-6 h-full overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-black">
          <TruckIcon className="w-6 h-6" />
          Truck Details
        </h2>

        <div className="space-y-4">
          {/* Truck Information */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold text-lg mb-3 text-black">{truck.name}</h3>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-black">Driver</p>
                <p className="font-medium text-black">{truck.driver_name}</p>
              </div>

              <div>
                <p className="text-black">Status</p>
                <p className={`inline-block px-2 py-1 rounded text-xs font-semibold ${statusColors[truck.status]}`}>
                  {truck.status}
                </p>
              </div>

              <div className="col-span-2">
                <p className="text-black flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Location
                </p>
                <p className="font-medium text-black">
                  {truck.latitude?.toFixed(6)}, {truck.longitude?.toFixed(6)}
                </p>
              </div>

              <div className="col-span-2">
                <p className="text-black">Last Updated</p>
                <p className="font-medium text-black">
                  {format(new Date(truck.updated_at), 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
            </div>
          </div>

          {/* Containers and Stocks */}
          <div>
            <h3 className="font-semibold text-lg mb-3 text-black flex items-center gap-2">
              <Package className="w-5 h-5" />
              Assigned Containers & Stock Items
            </h3>

            {loading ? (
              <p className="text-black">Loading containers...</p>
            ) : containers.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">No containers assigned</p>
              </div>
            ) : (
              <div className="space-y-3">
                {containers.map((container) => (
                  <div
                    key={container.id}
                    className={`border rounded-lg overflow-hidden transition ${
                      container.status === 'Delivered'
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {/* Container Header */}
                    <div className="p-3 bg-gray-50 border-b flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-sm text-black">{container.container_number}</p>
                        <p className="text-xs text-gray-600">
                          ID: {container.id.slice(0, 8)}...
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            containerStatusColors[container.status] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {container.status}
                        </span>
                        {container.status === 'Delivered' && (
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                    </div>

                    {/* Stock Items */}
                    {container.stocks.length > 0 ? (
                      <div className="p-3">
                        <p className="text-xs font-semibold text-gray-600 mb-2">
                          Total Items: <span className="text-blue-600">{container.totalItems}</span>
                        </p>
                        <div className="space-y-2">
                          {container.stocks.map((stock) => (
                            <div key={stock.id} className="flex justify-between items-center text-xs p-2 bg-gray-50 rounded hover:bg-gray-100 transition">
                              <div className="flex-1">
                                <span className="text-black font-medium block">{stock.item_name}</span>
                                <span className="text-gray-600 text-xs">
                                  {stock.quantity} {stock.unit}
                                </span>
                              </div>
                              {container.status !== 'Delivered' && (
                                <button
                                  onClick={() => handleEditStock(stock)}
                                  className="ml-2 p-1.5 hover:bg-blue-100 text-blue-600 rounded transition"
                                  title="Edit stock"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Action Button */}
                        {container.status !== 'Delivered' && (
                          <button
                            onClick={() => handleMarkAsDelivered(container.id)}
                            disabled={deliveringContainerId === container.id}
                            className="mt-3 w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded transition disabled:bg-gray-400"
                          >
                            {deliveringContainerId === container.id ? 'Marking Delivered...' : 'Mark as Delivered'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 text-center text-xs text-gray-500">
                        No stock items in this container
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingStock && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40 transition-opacity"
            onClick={() => setEditingStock(null)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
              <div className="sticky top-0 flex items-center justify-between p-6 border-b bg-white rounded-t-xl">
                <h2 className="text-xl font-bold text-black">Edit Stock Item</h2>
                <button
                  onClick={() => setEditingStock(null)}
                  className="text-gray-500 hover:text-gray-700 transition"
                >
                  <X size={24} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveEdit();
                }}
                className="p-6 space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Item Name
                  </label>
                  <input
                    type="text"
                    value={editFormData.item_name || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Item name cannot be changed</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={editFormData.quantity || ''}
                      onChange={(e) =>
                        setEditFormData((prev) => ({
                          ...prev,
                          quantity: e.target.value ? parseInt(e.target.value) : prev.quantity,
                        }))
                      }
                      min="0"
                      step="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={editFormData.unit || ''}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Description
                  </label>
                  <textarea
                    value={editFormData.description || ''}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Add or update description..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black placeholder-gray-400"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingStock(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-black rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Save Changes
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
