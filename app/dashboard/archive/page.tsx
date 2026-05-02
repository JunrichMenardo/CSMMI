'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Archive, RotateCcw, Trash, Trash2 } from 'lucide-react';

interface ArchivedItem {
  id: string;
  entity_id: string;
  name: string;
  type: 'truck' | 'container' | 'stock';
  date: string;
  payload: any;
}

interface TrashItem {
  id: string;
  entity_id: string;
  entity_type: 'truck' | 'container' | 'stock';
  name: string;
  deleted_at: string;
}

export default function ArchiveAndTrashPage() {
  const router = useRouter();
  const [archivedItems, setArchivedItems] = useState<ArchivedItem[]>([]);
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'archive' | 'trash'>('archive');

  const [archiveFilter, setArchiveFilter] = useState<'all' | 'truck' | 'container' | 'stock'>('all');
  const [archiveSearchTerm, setArchiveSearchTerm] = useState('');
  const [archiveSortBy, setArchiveSortBy] = useState<'name' | 'type' | 'date'>('date');
  const [archiveSortOrder, setArchiveSortOrder] = useState<'asc' | 'desc'>('desc');

  const [trashFilter, setTrashFilter] = useState<'all' | 'truck' | 'container' | 'stock'>('all');
  const [trashSearchTerm, setTrashSearchTerm] = useState('');
  const [trashSortBy, setTrashSortBy] = useState<'name' | 'type' | 'date'>('date');
  const [trashSortOrder, setTrashSortOrder] = useState<'asc' | 'desc'>('desc');

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

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      try {
        const { data: archiveData, error: archiveError } = await supabase
          .from('archives')
          .select('*')
          .order('created_at', { ascending: false });

        if (!archiveError && archiveData) {
          const mapped = archiveData.map((row: any) => ({
            id: String(row.id),
            entity_id: String(row.entity_id || row.id),
            name:
              row.payload?.name ||
              row.payload?.item_name ||
              row.payload?.truck_number ||
              row.payload?.container_number ||
              row.name ||
              'Unnamed',
            type: (row.entity_type || row.type || row.payload?.entity_type || 'stock') as 'truck' | 'container' | 'stock',
            date: row.archived_at || row.created_at || new Date().toISOString(),
            payload: row.payload || row.entity_data || null,
          }));
          setArchivedItems(mapped);
        }

        const { data: trashData, error: trashError } = await supabase
          .from('trash')
          .select('*')
          .order('deleted_at', { ascending: false });

        if (!trashError && trashData) {
          const mapped = trashData.map((row: any) => ({
            id: String(row.id),
            entity_id: String(row.entity_id),
            entity_type: row.entity_type as 'truck' | 'container' | 'stock',
            name:
              row.entity_data?.name ||
              row.entity_data?.item_name ||
              row.entity_data?.truck_number ||
              row.entity_data?.container_number ||
              'Unnamed',
            deleted_at: row.deleted_at,
          }));
          setTrashItems(mapped);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated]);

  const displayedArchive = (archiveFilter === 'all'
    ? archivedItems
    : archivedItems.filter((a) => a.type === archiveFilter)
  )
    .filter((item) => {
      const q = archiveSearchTerm.trim().toLowerCase();
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.type.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const dir = archiveSortOrder === 'asc' ? 1 : -1;
      if (archiveSortBy === 'name') return a.name.localeCompare(b.name) * dir;
      if (archiveSortBy === 'type') return a.type.localeCompare(b.type) * dir;
      return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir;
    });

  const displayedTrash = (trashFilter === 'all'
    ? trashItems
    : trashItems.filter((a) => a.entity_type === trashFilter)
  )
    .filter((item) => {
      const q = trashSearchTerm.trim().toLowerCase();
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.entity_type.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const dir = trashSortOrder === 'asc' ? 1 : -1;
      if (trashSortBy === 'name') return a.name.localeCompare(b.name) * dir;
      if (trashSortBy === 'type') return a.entity_type.localeCompare(b.entity_type) * dir;
      return (new Date(a.deleted_at).getTime() - new Date(b.deleted_at).getTime()) * dir;
    });

  const handlePermanentDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to permanently delete this item? This cannot be undone.')) return;

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

  const handleArchivePermanentDelete = async (archiveRowId: string) => {
    if (!confirm('Are you sure you want to permanently delete this archived item? This cannot be undone.')) return;

    try {
      const { error } = await supabase.from('archives').delete().eq('id', archiveRowId);
      if (error) {
        alert('Failed to delete archived item');
        return;
      }
      setArchivedItems((prev) => prev.filter((item) => item.id !== archiveRowId));
      alert('Archived item deleted');
    } catch (error) {
      console.error('Failed to delete archived item:', error);
      alert('Failed to permanently delete archived item');
    }
  };

  const handleArchiveRestore = async (item: ArchivedItem) => {
    if (!confirm('Restore this archived item?')) return;

    try {
      const payload = item.payload;
      if (!payload) {
        alert('No archived payload found to restore');
        return;
      }

      if (item.type === 'truck') {
        const { error } = await supabase.from('trucks').insert([payload]);
        if (error) {
          alert('Failed to restore truck');
          return;
        }
      } else if (item.type === 'container') {
        const { error } = await supabase.from('containers').insert([payload]);
        if (error) {
          alert('Failed to restore container');
          return;
        }
      } else {
        const { error } = await supabase.from('stocks').insert([payload]);
        if (error) {
          alert('Failed to restore stock');
          return;
        }
      }

      const { error: deleteArchiveError } = await supabase.from('archives').delete().eq('id', item.id);
      if (deleteArchiveError) {
        alert('Item restored, but failed to remove it from archive.');
      }

      setArchivedItems((prev) => prev.filter((a) => a.id !== item.id));
      alert('Item restored successfully');
    } catch (error) {
      console.error('Failed to restore archived item:', error);
      alert('Failed to restore archived item');
    }
  };

  const handleRestore = async (trashId: string, item: TrashItem) => {
    if (!confirm('Restore this item?')) return;

    try {
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
      } else {
        const { error } = await supabase.from('stocks').insert([entityData]);
        if (error) {
          alert('Failed to restore stock');
          return;
        }
      }

      const { error: deleteError } = await supabase.from('trash').delete().eq('id', trashId);
      if (deleteError) {
        alert('Item restored, but failed to remove it from trash.');
      }
      setTrashItems((prev) => prev.filter((i) => i.id !== trashId));
      alert('Item restored successfully');
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
          <p className="text-black">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      <Header />

      <main className="dashboard-main px-4 sm:px-6 lg:px-8 py-8 lg:ml-64">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black">Archive and Recently Deleted</h1>
          <p className="text-black mt-2">Manage archived items and recover deleted items from trash</p>
        </div>

        <div className="mb-6 flex gap-2 border-b border-gray-300 overflow-x-auto">
          <button
            onClick={() => setActiveTab('archive')}
            className={`px-6 py-3 font-semibold transition border-b-2 whitespace-nowrap ${
              activeTab === 'archive'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            <Archive className="inline mr-2 h-5 w-5" />
            Archived ({archivedItems.length})
          </button>
          <button
            onClick={() => setActiveTab('trash')}
            className={`px-6 py-3 font-semibold transition border-b-2 whitespace-nowrap ${
              activeTab === 'trash'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            <Trash2 className="inline mr-2 h-5 w-5" />
            Recently Deleted ({trashItems.length})
          </button>
        </div>

        {activeTab === 'archive' && (
          <div>
            <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setArchiveFilter('all')}
                  className={`px-3 py-1 rounded transition ${archiveFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-black hover:bg-gray-200'}`}
                >
                  All ({archivedItems.length})
                </button>
                <button
                  onClick={() => setArchiveFilter('truck')}
                  className={`px-3 py-1 rounded transition ${archiveFilter === 'truck' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-black hover:bg-gray-200'}`}
                >
                  Trucks ({archivedItems.filter((a) => a.type === 'truck').length})
                </button>
                <button
                  onClick={() => setArchiveFilter('container')}
                  className={`px-3 py-1 rounded transition ${archiveFilter === 'container' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-black hover:bg-gray-200'}`}
                >
                  Containers ({archivedItems.filter((a) => a.type === 'container').length})
                </button>
                <button
                  onClick={() => setArchiveFilter('stock')}
                  className={`px-3 py-1 rounded transition ${archiveFilter === 'stock' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-black hover:bg-gray-200'}`}
                >
                  Stocks ({archivedItems.filter((a) => a.type === 'stock').length})
                </button>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="w-full lg:max-w-md">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Search</label>
                  <input
                    type="text"
                    placeholder="Search archived items..."
                    value={archiveSearchTerm}
                    onChange={(e) => setArchiveSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Sort by</label>
                    <select
                      value={archiveSortBy}
                      onChange={(e) => setArchiveSortBy(e.target.value as 'name' | 'type' | 'date')}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="date">Date</option>
                      <option value="name">Name</option>
                      <option value="type">Type</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Order</label>
                    <select
                      value={archiveSortOrder}
                      onChange={(e) => setArchiveSortOrder(e.target.value as 'asc' | 'desc')}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="desc">Newest First</option>
                      <option value="asc">Oldest First</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-black">Item Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-black">Type</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-black">Date</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-black">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {displayedArchive.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12">
                          <div className="flex flex-col items-center justify-center text-black">
                            <Archive className="mb-4 h-12 w-12 text-gray-400" />
                            <p className="text-center text-black">No archived items for this category</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      displayedArchive.map((item) => (
                        <tr key={item.id} className="transition hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-black">{item.name}</td>
                          <td className="px-6 py-4">
                            {(() => {
                              const itemType = item.type || 'stock';
                              return (
                            <span
                              className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                                itemType === 'truck'
                                  ? 'bg-blue-100 text-blue-700'
                                  : itemType === 'container'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {itemType.charAt(0).toUpperCase() + itemType.slice(1)}
                            </span>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(item.date).toLocaleDateString()} {new Date(item.date).toLocaleTimeString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleArchiveRestore(item)}
                              className="mr-2 inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                              title="Restore item"
                            >
                              <RotateCcw size={16} />
                              Restore
                            </button>
                            <button
                              onClick={() => handleArchivePermanentDelete(item.id)}
                              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                              title="Permanently delete"
                            >
                              <Trash2 size={16} />
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trash' && (
          <div>
            <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setTrashFilter('all')}
                  className={`px-3 py-1 rounded transition ${trashFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-black hover:bg-gray-200'}`}
                >
                  All ({trashItems.length})
                </button>
                <button
                  onClick={() => setTrashFilter('truck')}
                  className={`px-3 py-1 rounded transition ${trashFilter === 'truck' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-black hover:bg-gray-200'}`}
                >
                  Trucks ({trashItems.filter((a) => a.entity_type === 'truck').length})
                </button>
                <button
                  onClick={() => setTrashFilter('container')}
                  className={`px-3 py-1 rounded transition ${trashFilter === 'container' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-black hover:bg-gray-200'}`}
                >
                  Containers ({trashItems.filter((a) => a.entity_type === 'container').length})
                </button>
                <button
                  onClick={() => setTrashFilter('stock')}
                  className={`px-3 py-1 rounded transition ${trashFilter === 'stock' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-black hover:bg-gray-200'}`}
                >
                  Stocks ({trashItems.filter((a) => a.entity_type === 'stock').length})
                </button>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="w-full lg:max-w-md">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Search</label>
                  <input
                    type="text"
                    placeholder="Search deleted items..."
                    value={trashSearchTerm}
                    onChange={(e) => setTrashSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Sort by</label>
                    <select
                      value={trashSortBy}
                      onChange={(e) => setTrashSortBy(e.target.value as 'name' | 'type' | 'date')}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="date">Date</option>
                      <option value="name">Name</option>
                      <option value="type">Type</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Order</label>
                    <select
                      value={trashSortOrder}
                      onChange={(e) => setTrashSortOrder(e.target.value as 'asc' | 'desc')}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="desc">Newest First</option>
                      <option value="asc">Oldest First</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white shadow-lg overflow-hidden">
              {displayedTrash.length === 0 ? (
                <div className="p-8 text-center">
                  <Trash className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                  <p className="text-lg font-medium text-black">No deleted items</p>
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
                      {displayedTrash.map((item) => (
                        <tr key={item.id} className="transition hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-black">{item.name}</td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                                item.entity_type === 'truck'
                                  ? 'bg-blue-100 text-blue-700'
                                  : item.entity_type === 'container'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {item.entity_type.charAt(0).toUpperCase() + item.entity_type.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(item.deleted_at).toLocaleDateString()} {new Date(item.deleted_at).toLocaleTimeString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleRestore(item.id, item)}
                              className="mr-2 inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                              title="Restore item"
                            >
                              <RotateCcw size={16} />
                              Restore
                            </button>
                            <button
                              onClick={() => handlePermanentDelete(item.id)}
                              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700"
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
          </div>
        )}
      </main>
    </div>
  );
}
