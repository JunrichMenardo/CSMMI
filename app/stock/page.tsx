'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Trash2, Edit2, Calendar } from 'lucide-react';
import { AddStockForm } from '@/components/AddStockForm';
import { fetchStocks, deleteStock } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { getUserRole, createManagerRequest, getManagerId } from '@/lib/managerUtils';
import { Stock } from '@/types';

export default function StockPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStocks();
  }, []);

  const loadStocks = async () => {
    try {
      setLoading(true);
      const data = await fetchStocks();
      setStocks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stocks');
    } finally {
      setLoading(false);
    }
  };

  const handleStockAdded = (newStock: Stock) => {
    setStocks((prev) => [newStock, ...prev]);
  };

  const handleDeleteStock = async (id: string) => {
    if (confirm('Are you sure you want to delete this stock item?')) {
      try {
        // Check user role
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          alert('You must be logged in');
          return;
        }

        const userRole = await getUserRole(session.user.id);

        // Manager: Create delete request
        if (userRole === 'manager') {
          const managerId = await getManagerId(session.user.id);
          if (!managerId) {
            alert('Manager account not found');
            return;
          }

          const created = await createManagerRequest(
            managerId,
            'delete_stock',
            'stock',
            { id: id },
            id
          );

          if (created) {
            alert('✅ Delete request submitted for admin approval!\n\nThe stock will be deleted after the admin reviews and approves your request.');
            // Remove from UI immediately for better UX
            setStocks((prev) => prev.filter((stock) => stock.id !== id));
          } else {
            alert('Failed to submit delete request');
          }
          return;
        }

        // Admin: Delete stock directly
        await deleteStock(id);
        setStocks((prev) => prev.filter((stock) => stock.id !== id));
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete stock');
      }
    }
  };

  const isNearExpiry = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.floor(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };

  const isExpired = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Stock Management</h1>
            <p className="text-gray-600 mt-2">Track and manage your inventory</p>
          </div>
          <AddStockForm onStockAdded={handleStockAdded} />
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading stocks...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && stocks.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No stock items yet</h3>
            <p className="text-gray-600 mb-6">Start by adding your first item to the inventory</p>
          </div>
        )}

        {/* Stock Grid */}
        {!loading && stocks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stocks.map((stock) => (
              <div
                key={stock.id}
                className={`bg-white rounded-lg border-2 p-6 transition hover:shadow-lg ${
                  isExpired(stock.expiry_date)
                    ? 'border-red-300 bg-red-50'
                    : isNearExpiry(stock.expiry_date)
                      ? 'border-yellow-300 bg-yellow-50'
                      : 'border-gray-200'
                }`}
              >
                {/* Status Badge */}
                {isExpired(stock.expiry_date) && (
                  <div className="inline-block bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded mb-2">
                    EXPIRED
                  </div>
                )}
                {isNearExpiry(stock.expiry_date) && (
                  <div className="inline-block bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded mb-2">
                    EXPIRING SOON
                  </div>
                )}

                {/* Item Name */}
                <h3 className="text-lg font-bold text-gray-900 mb-3">{stock.item_name}</h3>

                {/* Stock Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Quantity:</span>
                    <span className="font-semibold text-gray-900">
                      {stock.quantity} {stock.unit}
                    </span>
                  </div>
                  {stock.price_per_unit && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Price:</span>
                      <span className="font-semibold text-gray-900">
                        ${(stock.price_per_unit * stock.quantity).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {stock.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {stock.description}
                  </p>
                )}

                {/* Expiry Date */}
                {stock.expiry_date && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                    <Calendar size={16} />
                    <span>
                      Expires: <strong>{formatDate(stock.expiry_date)}</strong>
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleDeleteStock(stock.id)}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg transition text-sm font-medium"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-lg transition text-sm font-medium">
                    <Edit2 size={16} />
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {!loading && stocks.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <p className="text-gray-600 text-sm">Total Items</p>
              <p className="text-3xl font-bold text-gray-900">{stocks.length}</p>
            </div>
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <p className="text-gray-600 text-sm">Total Value</p>
              <p className="text-3xl font-bold text-gray-900">
                ${stocks
                  .reduce(
                    (sum, stock) => sum + ((stock.price_per_unit || 0) * stock.quantity),
                    0
                  )
                  .toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <p className="text-gray-600 text-sm">Expiring Soon</p>
              <p className="text-3xl font-bold text-yellow-600">
                {stocks.filter((s) => isNearExpiry(s.expiry_date)).length}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
