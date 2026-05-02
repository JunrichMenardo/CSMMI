'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserRole, createManagerRequest, getManagerId } from '@/lib/managerUtils';
import { Stock, Container } from '@/types';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { fetchStocks, fetchContainers, deleteStock } from '@/lib/api';
import { Package, Trash2, Package as PackageIcon, Archive } from 'lucide-react';

export default function StockManagementPage() {
  const router = useRouter();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'expiry'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/auth');
        return;
      }
      setIsAuthenticated(true);
    };
    checkAuth();
  }, [router]);

  // Load stocks and containers
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      try {
        const [stocksData, containersData] = await Promise.all([
          fetchStocks(),
          fetchContainers(),
        ]);
        setStocks(stocksData);
        setContainers(containersData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Subscribe to stock updates
    const stocksChannel = supabase.channel('stocks-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stocks' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setStocks((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setStocks((prev) =>
              prev.map((s) => (s.id === payload.new.id ? payload.new : s))
            );
          } else if (payload.eventType === 'DELETE') {
            setStocks((prev) => prev.filter((s) => s.id !== payload.old.id));
            setSelectedStockId(null);
          }
        }
      )
      .subscribe();

    // Subscribe to container updates
    const containersChannel = supabase.channel('containers-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'containers' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setContainers((prev) => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setContainers((prev) =>
              prev.map((c) => (c.id === payload.new.id ? payload.new : c))
            );
          } else if (payload.eventType === 'DELETE') {
            setContainers((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      stocksChannel.unsubscribe();
      containersChannel.unsubscribe();
    };
  }, [isAuthenticated]);

  const handleDeleteStock = async (stockId: string) => {
    if (!confirm('Are you sure you want to delete this stock item?')) {
      return;
    }

    try {
      // Check user role
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        alert('You must be logged in');
        return;
      }

      const userRole = await getUserRole(session.user.id);

      const stock = stocks.find((s) => s.id === stockId);
      if (!stock) {
        alert('Stock not found');
        return;
      }

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
          stock,
          stockId
        );

        if (created) {
          alert('✅ Delete request submitted for admin approval!\n\nThe stock will be moved to trash after the admin reviews and approves your request.');
        } else {
          alert('Failed to submit delete request');
        }
        return;
      }

      // Admin: Move stock to trash
      // Insert into trash table
      const { error: trashError } = await supabase.from('trash').insert([
        {
          entity_id: stockId,
          entity_type: 'stock',
          entity_data: stock,
          deleted_by: session.user.id,
        },
      ]);

      if (trashError) {
        console.error('Failed to move to trash:', trashError);
        alert('Failed to delete stock — could not move to trash');
        return;
      }

      // Delete stock from original table
      await deleteStock(stockId);
      setStocks((prev) => prev.filter((s) => s.id !== stockId));
      setSelectedStockId(null);
      alert('✅ Stock moved to trash');
    } catch (error) {
      console.error('Failed to delete stock:', error);
      alert('Failed to delete stock');
    }
  };

  const handleArchiveStock = async (stockId: string) => {
    if (!confirm('Are you sure you want to archive this stock item?')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        alert('You must be logged in');
        return;
      }

      const userRole = await getUserRole(session.user.id);
      const stock = stocks.find((s) => s.id === stockId);
      if (!stock) {
        alert('Stock not found');
        return;
      }

      if (userRole === 'manager') {
        const managerId = await getManagerId(session.user.id);
        if (!managerId) {
          alert('Manager account not found');
          return;
        }

        const created = await createManagerRequest(
          managerId,
          'archive_stock',
          'stock',
          stock,
          stockId
        );

        if (created) {
          alert('✅ Archive request submitted for admin approval!');
        } else {
          alert('Failed to submit archive request');
        }
        return;
      }

      const { error: insertError } = await supabase.from('archives').insert([
        {
          entity_id: stock.id,
          name: stock.item_name,
          type: 'stock',
          payload: stock,
          archived_at: new Date().toISOString(),
        },
      ]);

      if (insertError) {
        console.error('Failed to archive: could not write to archives table:', insertError);
        alert('Failed to archive stock — archives storage is not available. Aborting.');
        return;
      }

      await deleteStock(stockId);
      setStocks((prev) => prev.filter((s) => s.id !== stockId));
      setSelectedStockId(null);
    } catch (error) {
      console.error('Failed to archive stock:', error);
      alert('Failed to archive stock');
    }
  };

  const selectedStock = stocks.find((s) => s.id === selectedStockId);
  const containerName = selectedStock
    ? containers.find((c) => c.id === selectedStock.container_id)?.container_number || 'Unknown'
    : '';

  // Filter + sort stocks based on search term and sort settings
  const filteredStocks = stocks
    .filter((stock) => {
      const q = searchTerm.trim().toLowerCase();
      if (!q) return true;
      return (
        stock.item_name.toLowerCase().includes(q) ||
        (stock.unit || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'name') return a.item_name.localeCompare(b.item_name) * dir;
      if (sortBy === 'quantity') return (a.quantity - b.quantity) * dir;
      if (sortBy === 'expiry') return (new Date(a.expiry_date || 0).getTime() - new Date(b.expiry_date || 0).getTime()) * dir;
      return 0;
    });

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-black">Loading stocks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      <Header title="Stock Management" />

      <main className="dashboard-main px-4 sm:px-6 lg:px-8 py-8 lg:ml-64">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-black">Stock Management</h1>
        </div>

        {/* Search Bar */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="w-full lg:max-w-md">
              <label className="mb-1 block text-sm font-medium text-gray-700">Search</label>
              <input
                type="text"
                placeholder="Search stocks by item name or unit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Sort by</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200">
                  <option value="name">Name</option>
                  <option value="quantity">Quantity</option>
                  <option value="expiry">Expiry</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Order</label>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200">
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stock List */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-4 text-black">
              Stock Items ({filteredStocks.length})
            </h2>

            {filteredStocks.length === 0 ? (
              <p className="text-black text-center py-8">No stocks available</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredStocks.map((stock) => (
                  <div
                    key={stock.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedStockId(stock.id)}
                    onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedStockId(stock.id); }}
                    className={`p-3 border rounded bg-white hover:bg-blue-50 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-200 ${selectedStockId === stock.id ? 'ring-2 ring-blue-300 bg-blue-50' : ''}`}
                  >
                    <p className="font-semibold text-sm text-black">{stock.item_name}</p>
                    <p className="text-xs text-gray-600 mt-1">Qty: {stock.quantity} {stock.unit}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stock Details */}
          <div className="lg:col-span-2">
            {selectedStock ? (
              <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-black">
                    <PackageIcon className="w-5 h-5" />
                    {selectedStock.item_name}
                  </h3>
                  <button
                    onClick={() => handleArchiveStock(selectedStock.id)}
                    className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition"
                    title="Archive stock"
                  >
                    <Archive size={18} />
                    Archive
                  </button>
                  <button
                    onClick={() => handleDeleteStock(selectedStock.id)}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
                    title="Delete stock"
                  >
                    <Trash2 size={18} />
                    Delete
                  </button>
                </div>

                {/* Stock Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Item Name</p>
                    <p className="font-medium text-black">{selectedStock.item_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Quantity</p>
                    <p className="font-medium text-black">
                      {selectedStock.quantity} {selectedStock.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Unit</p>
                    <p className="font-medium text-black">{selectedStock.unit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Price per Unit</p>
                    <p className="font-medium text-black">
                      ${selectedStock.price_per_unit?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>

                {/* Container Assignment */}
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-2">Container Assignment</p>
                  {selectedStock.container_id ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="font-medium text-blue-900">✓ {containerName}</p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-gray-600">Not assigned to any container</p>
                    </div>
                  )}
                </div>

                {/* Expiry Date */}
                {selectedStock.expiry_date && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-600 mb-2">Expiry Date</p>
                    <p className="font-medium text-black">
                      {new Date(selectedStock.expiry_date).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {/* Description */}
                {selectedStock.description && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-600 mb-2">Description</p>
                    <p className="text-black">{selectedStock.description}</p>
                  </div>
                )}

                {/* Created/Updated Info */}
                <div className="border-t pt-4 space-y-2">
                  <p className="text-xs text-gray-500">
                    Created: {new Date(selectedStock.created_at).toLocaleString()}
                  </p>
                  {selectedStock.updated_at && (
                    <p className="text-xs text-gray-500">
                      Updated: {new Date(selectedStock.updated_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-6 flex items-center justify-center min-h-96">
                <p className="text-black text-center">
                  Select a stock item to view details
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
