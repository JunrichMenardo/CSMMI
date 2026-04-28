'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { addStock } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { getUserRole, createManagerRequest, getManagerId } from '@/lib/managerUtils';
import { Stock } from '@/types';

interface AddStockFormProps {
  onStockAdded: (stock: Stock) => void;
}

export const AddStockForm: React.FC<AddStockFormProps> = ({ onStockAdded }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    item_name: '',
    quantity: '1',
    unit: 'pieces',
    price_per_unit: '0',
    description: '',
    expiry_date: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'quantity' || name === 'price_per_unit' ? Math.max(0, parseFloat(value) || 0) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.item_name.trim()) {
        setError('Item name is required');
        setLoading(false);
        return;
      }

      if (Number(formData.quantity) <= 0) {
        setError('Quantity must be greater than 0');
        setLoading(false);
        return;
      }

      // Check user role
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setError('You must be logged in');
        setLoading(false);
        return;
      }

      const userRole = await getUserRole(session.user.id);

      const stockData = {
        item_name: formData.item_name,
        quantity: Number(formData.quantity),
        unit: formData.unit,
        price_per_unit: Number(formData.price_per_unit) || null,
        description: formData.description || null,
        expiry_date: formData.expiry_date ? new Date(formData.expiry_date).toISOString() : null,
        container_id: null,
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
          'add_stock',
          'stock',
          stockData
        );

        if (created) {
          alert('✅ Request submitted for admin approval!');
          // Reset form
          setFormData({
            item_name: '',
            quantity: '1',
            unit: 'pieces',
            price_per_unit: '0',
            description: '',
            expiry_date: '',
          });
          setIsOpen(false);
        } else {
          setError('Failed to submit request');
        }
        return;
      }

      // Admin: Add stock directly
      const stock = await addStock(stockData);

      onStockAdded(stock);

      // Reset form
      setFormData({
        item_name: '',
        quantity: '1',
        unit: 'pieces',
        price_per_unit: '0',
        description: '',
        expiry_date: '',
      });
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add stock');
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
        Add Stock
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
                <h2 className="text-xl font-bold text-black">Add New Stock</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700 transition"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="bg-red-100 text-red-700 p-3 rounded text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    name="item_name"
                    value={formData.item_name}
                    onChange={handleChange}
                    placeholder="e.g., Mechanical Parts"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black placeholder-gray-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      placeholder="1"
                      min="1"
                      step="1"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Unit *
                    </label>
                    <select
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black"
                    >
                      <option value="pieces">Pieces</option>
                      <option value="kg">Kg</option>
                      <option value="liter">Liter</option>
                      <option value="meter">Meter</option>
                      <option value="box">Box</option>
                      <option value="pack">Pack</option>
                      <option value="units">Units</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Price per Unit
                  </label>
                  <input
                    type="number"
                    name="price_per_unit"
                    value={formData.price_per_unit}
                    onChange={handleChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black placeholder-gray-400"
                  />
                  <p className="text-xs text-gray-600 mt-1">Optional field for cost tracking</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    name="expiry_date"
                    value={formData.expiry_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black"
                  />
                  <p className="text-xs text-gray-600 mt-1">Optional field for perishable items</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Add notes or description..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black placeholder-gray-400"
                  />
                </div>

                <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-4">
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
                    {loading ? 'Adding...' : 'Add Stock'}
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
