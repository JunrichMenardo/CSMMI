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
  type: 'truck' | 'container';
  archivedAt: string;
}

export default function ArchivePage() {
  const router = useRouter();
  const [archivedItems, setArchivedItems] = useState<ArchivedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
        // In a real application, you would fetch archived items from the database
        // For now, we'll show sample data
        setArchivedItems([]);
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

      <main className="ml-64 px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black">Archive</h1>
          <p className="text-black mt-2">View and manage archived trucks and containers</p>
        </div>

        {/* Archived Items */}
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
                {archivedItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12">
                      <div className="flex flex-col items-center justify-center text-black">
                        <Archive className="w-12 h-12 mb-4 text-gray-400" />
                        <p className="text-center text-black">No archived items yet</p>
                        <p className="text-sm text-black mt-1">
                          Trucks and containers you archive will appear here
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  archivedItems.map((item) => (
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
                        <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition" title="Restore">
                          <RotateCcw size={18} />
                        </button>
                        <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Permanently delete">
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
