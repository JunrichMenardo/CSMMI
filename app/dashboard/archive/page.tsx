'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Archive, RotateCcw, Trash2, Calendar } from 'lucide-react';

interface ArchivedItem {
  id: string;
  name: string;
  type: 'truck' | 'container' | 'stock';
  archivedAt: string;
}

export default function ArchivePage() {
  const router = useRouter();
  const [archivedItems, setArchivedItems] = useState<ArchivedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [filter, setFilter] = useState<'all' | 'truck' | 'container' | 'stock'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const filteredItems = filter === 'all' ? archivedItems : archivedItems.filter((a) => a.type === filter);
  const displayedItems = filteredItems
    .filter((it) => {
      const q = searchTerm.trim().toLowerCase();
      if (!q) return true;
      return (it.name || '').toLowerCase().includes(q) || (it.type || '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'name') return a.name.localeCompare(b.name) * dir;
      if (sortBy === 'type') return a.type.localeCompare(b.type) * dir;
      return (new Date(a.archivedAt).getTime() - new Date(b.archivedAt).getTime()) * dir;
    });
  

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

  // Load archived items
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadArchive = async () => {
      try {
        const { data, error } = await supabase.from('archives').select('*').order('archived_at', { ascending: false });
        console.debug('Loaded archives result:', { data, error });
        if (error) {
          console.warn('Failed to load archives table (it may not exist):', error);
          setArchivedItems([]);
        } else if (!data) {
          setArchivedItems([]);
        } else {
            // Map to ArchivedItem shape
            const mapped = (data || []).map((row: any) => ({
              id: (row.entity_id || row.id) as string,
              name: row.name || (row.payload && (row.payload.name || row.payload.item_name)) || 'Unnamed',
              type: (row.type || 'truck') as 'truck' | 'container' | 'stock',
              archivedAt: row.archived_at || row.created_at || new Date().toISOString(),
            }));
            setArchivedItems(mapped);
        }
      } catch (error) {
        console.error('Failed to load archive:', error);
      } finally {
        setLoading(false);
      }
    };

    loadArchive();
  }, [isAuthenticated]);

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-black">Loading archive...</p>
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
          <h1 className="text-3xl font-bold text-black">Archive</h1>
          <p className="text-black mt-2">View and manage archived trucks and containers</p>
        </div>

        {/* Archived Items */}
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-black'}`}>
              All ({archivedItems.length})
            </button>
            <button
              onClick={() => setFilter('truck')}
              className={`px-3 py-1 rounded ${filter === 'truck' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-black'}`}>
              Trucks ({archivedItems.filter(a => a.type === 'truck').length})
            </button>
            <button
              onClick={() => setFilter('container')}
              className={`px-3 py-1 rounded ${filter === 'container' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-black'}`}>
              Containers ({archivedItems.filter(a => a.type === 'container').length})
            </button>
            <button
              onClick={() => setFilter('stock')}
              className={`px-3 py-1 rounded ${filter === 'stock' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-black'}`}>
              Stocks ({archivedItems.filter(a => a.type === 'stock').length})
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="w-full lg:max-w-md">
              <label className="mb-1 block text-sm font-medium text-gray-700">Search</label>
              <input
                type="text"
                placeholder="Search archive..."
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
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black">
                    Item Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black">
                    Archived Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-black">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {displayedItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12">
                      <div className="flex flex-col items-center justify-center text-black">
                        <Archive className="w-12 h-12 mb-4 text-gray-400" />
                        <p className="text-center text-black">No archived items yet for this category</p>
                        <p className="text-sm text-black mt-1">
                          Archive items of type "{filter === 'all' ? 'all' : filter}" will appear here
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-medium text-black">
                        {item.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-black capitalize">
                          {item.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-black">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-gray-400" />
                          {new Date(item.archivedAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        <button
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                          title="Restore"
                          onClick={async () => {
                            if (!confirm('Restore this archived item back to active records?')) return;
                            try {
                              const { data: rows, error: fetchError } = await supabase.from('archives').select('*').eq('entity_id', item.id).single();
                              if (fetchError) throw fetchError;
                              const payload = rows?.payload || rows;
                              if (!payload) throw new Error('No payload to restore');

                              // Insert back into the proper table
                              if (item.type === 'truck') {
                                await supabase.from('trucks').insert([payload]);
                              } else if (item.type === 'container') {
                                await supabase.from('containers').insert([payload]);
                              } else if (item.type === 'stock') {
                                await supabase.from('stocks').insert([payload]);
                              }

                              // Remove from archives
                              await supabase.from('archives').delete().eq('entity_id', item.id);
                              setArchivedItems((prev) => prev.filter((p) => p.id !== item.id));
                            } catch (e) {
                              console.error('Failed to restore archived item:', e);
                              alert('Failed to restore archived item');
                            }
                          }}
                        >
                          <RotateCcw size={18} />
                        </button>
                          <button
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Permanently delete"
                            onClick={async () => {
                              if (!confirm('Permanently delete this archived item? This cannot be undone.')) return;
                              try {
                                // delete from archives table
                                const { error } = await supabase.from('archives').delete().eq('entity_id', item.id);
                                if (error) throw error;
                                setArchivedItems((prev) => prev.filter((p) => p.id !== item.id));
                              } catch (e) {
                                console.error('Failed to delete archived item:', e);
                                alert('Failed to delete archived item');
                              }
                            }}
                          >
                            <Trash2 size={18} />
                          </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Archive Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">About Archive</h3>
          <p className="text-blue-800 text-sm">
            Items archived will be moved to this section and kept for historical records. You can restore archived items or permanently delete them. Archived items will not appear in active management views.
          </p>
        </div>
      </main>
    </div>
  );
}
