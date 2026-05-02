'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Trash2, RotateCcw, Trash } from 'lucide-react';

interface TrashItem {
  id: string;
  entity_id: string;
  entity_type: 'truck' | 'container' | 'stock';
  name: string;
  deleted_at: string;
}

export default function TrashPage() {
  const router = useRouter();
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [filter, setFilter] = useState<'all' | 'truck' | 'container' | 'stock'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

  // Load trash items
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadTrash = async () => {
      try {
        const { data, error } = await supabase.from('trash').select('*').order('deleted_at', { ascending: false });
        
        if (error) {
          console.warn('Failed to load trash table:', error);
          setTrashItems([]);
        } else if (!data) {
          setTrashItems([]);
        } else {
          const mapped = (data || []).map((row: any) => ({
            id: row.id,
            entity_id: row.entity_id,
            entity_type: row.entity_type,
            name: row.entity_data?.name || row.entity_data?.item_name || row.entity_data?.truck_number || row.entity_data?.container_number || 'Unnamed',
            deleted_at: row.deleted_at,
          }));
          setTrashItems(mapped);
        }
      } catch (error) {
        console.error('Failed to load trash:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTrash();
  }, [isAuthenticated]);

  const filteredItems = filter === 'all' ? trashItems : trashItems.filter((a) => a.entity_type === filter);
  
  const displayedItems = filteredItems
    .filter((it) => {
      const q = searchTerm.trim().toLowerCase();
      if (!q) return true;
      return (it.name || '').toLowerCase().includes(q) || (it.entity_type || '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'name') return a.name.localeCompare(b.name) * dir;
      if (sortBy === 'type') return a.entity_type.localeCompare(b.entity_type) * dir;
      return (new Date(a.deleted_at).getTime() - new Date(b.deleted_at).getTime()) * dir;
    });

  const handlePermanentDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to permanently delete this item? This cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase.from('trash').delete().eq('id', itemId);
      if (error) {
        alert('Failed to delete from trash');
        return;
      }
      setTrashItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (error) {
      console.error('Failed to permanently delete:', error);
      alert('Failed to permanently delete item');
    }
  };

  const handleRestore = async (trashId: string, item: TrashItem) => {
    if (!confirm('Restore this item?')) {
      return;
    }

    try {
      // Get the original entity data
      const { data: trashData, error: trashError } = await supabase
        .from('trash')
        .select('entity_data')
        .eq('id', trashId)
        .single();

      if (trashError) {
        alert('Failed to fetch item data');
        return;
      }

      const entityData = trashData.entity_data;

      // Restore to original table
      if (item.entity_type === 'truck') {
        const { error } = await supabase.from('trucks').insert([entityData]);
        if (error) {
          alert('Failed to restore truck');
          return;
        }
      } else if (item.entity_type === 'container') {
        const { error } = await supabase.from('containers').insert([entityData]);
        if (error) {
          alert('Failed to restore container');
          return;
        }
      } else if (item.entity_type === 'stock') {
        const { error } = await supabase.from('stocks').insert([entityData]);
        if (error) {
          alert('Failed to restore stock');
          return;
        }
      }

      // Remove from trash
      await supabase.from('trash').delete().eq('id', trashId);
      setTrashItems((prev) => prev.filter((i) => i.id !== trashId));
      alert('✅ Item restored successfully');
    } catch (error) {
      console.error('Failed to restore:', error);
      alert('Failed to restore item');
    }
  };

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-black">Loading trash...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      <Header />

      <main className="dashboard-main px-4 sm:px-6 lg:px-8 py-8 lg:ml-64">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black flex items-center gap-2">
            <Trash2 className="w-8 h-8" />
            Recently Deleted
          </h1>
          <p className="text-black mt-2">View and manage recently deleted items. Items can be restored or permanently deleted.</p>
        </div>

        {/* Filter Buttons */}
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded transition ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-black hover:bg-gray-200'}`}
            >
              All ({trashItems.length})
            </button>
            <button
              onClick={() => setFilter('truck')}
              className={`px-3 py-1 rounded transition ${filter === 'truck' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-black hover:bg-gray-200'}`}
            >
              Trucks ({trashItems.filter(a => a.entity_type === 'truck').length})
            </button>
            <button
              onClick={() => setFilter('container')}
              className={`px-3 py-1 rounded transition ${filter === 'container' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-black hover:bg-gray-200'}`}
            >
              Containers ({trashItems.filter(a => a.entity_type === 'container').length})
            </button>
            <button
              onClick={() => setFilter('stock')}
              className={`px-3 py-1 rounded transition ${filter === 'stock' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-black hover:bg-gray-200'}`}
            >
              Stocks ({trashItems.filter(a => a.entity_type === 'stock').length})
            </button>
          </div>

          {/* Search and Sort */}
          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="w-full lg:max-w-md">
              <label className="mb-1 block text-sm font-medium text-gray-700">Search</label>
              <input
                type="text"
                placeholder="Search deleted items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Sort by</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200">
                  <option value="date">Date</option>
                  <option value="name">Name</option>
                  <option value="type">Type</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Order</label>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200">
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Trash Items List */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {displayedItems.length === 0 ? (
            <div className="p-8 text-center">
              <Trash className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-black text-lg font-medium">No deleted items</p>
              <p className="text-gray-600 text-sm">Your trash is empty</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Deleted</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {displayedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm text-black font-medium">{item.name}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          item.entity_type === 'truck' ? 'bg-blue-100 text-blue-700' :
                          item.entity_type === 'container' ? 'bg-green-100 text-green-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {item.entity_type.charAt(0).toUpperCase() + item.entity_type.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(item.deleted_at).toLocaleDateString()} {new Date(item.deleted_at).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRestore(item.id, item)}
                          className="mr-2 inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition text-sm font-medium"
                          title="Restore item"
                        >
                          <RotateCcw size={16} />
                          Restore
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(item.id)}
                          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition text-sm font-medium"
                          title="Permanently delete"
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
