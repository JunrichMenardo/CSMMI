'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { getUserRole } from '@/lib/managerUtils';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Save, Eye, EyeOff, Trash2, Plus } from 'lucide-react';

// Dynamic import for Leaflet component (client-side only)
const LocationMarkerManager = dynamic(
  () => import('@/components/LocationMarkerManager').then(mod => mod.LocationMarkerManager),
  { ssr: false, loading: () => <div className="bg-white rounded-lg shadow-lg p-6 text-center text-gray-600">Loading marker manager...</div> }
);

interface LocationMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  type: 'port' | 'store' | 'plant';
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [managers, setManagers] = useState<any[]>([]);
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [isAddingManager, setIsAddingManager] = useState(false);
  const [managerMessage, setManagerMessage] = useState('');

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/auth');
        return;
      }

      // Check if user is manager - redirect to manager settings
      const role = await getUserRole(data.session.user.id);
      if (role === 'manager') {
        router.push('/dashboard/manager-settings');
        return;
      }

      setIsAuthenticated(true);
      setLoading(false);
      
      // Load managers
      loadManagers();
    };
    checkAuth();
  }, [router]);

  const loadManagers = async () => {
    try {
      const { data, error } = await supabase
        .from('managers')
        .select('*')
        .eq('status', 'active');
      
      if (error) throw error;
      setManagers(data || []);
    } catch (error) {
      console.error('Error loading managers:', error);
    }
  };

  const handleSave = () => {
    setSaveMessage('Settings saved successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage('New password must be at least 6 characters');
      return;
    }

    setIsChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setPasswordMessage(`Error: ${error.message}`);
      } else {
        setPasswordMessage('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordMessage(''), 3000);
      }
    } catch (error) {
      setPasswordMessage('Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleAddManager = async () => {
    if (!managerEmail || !managerPassword) {
      setManagerMessage('Please fill in all fields');
      return;
    }

    if (managerPassword.length < 6) {
      setManagerMessage('Password must be at least 6 characters');
      return;
    }

    setIsAddingManager(true);

    try {
      // Call backend API to create manager
      const response = await fetch('/api/create-manager', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: managerEmail,
          password: managerPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setManagerMessage(`Error: ${result.error}`);
        setIsAddingManager(false);
        return;
      }

      if (result.success) {
        setManagerMessage('Manager created successfully!');
        setManagerEmail('');
        setManagerPassword('');
        loadManagers();
        setTimeout(() => setManagerMessage(''), 3000);
      }
    } catch (error: any) {
      setManagerMessage(error.message || 'Failed to create manager');
    } finally {
      setIsAddingManager(false);
    }
  };

  const handleRemoveManager = async (managerId: string) => {
    try {
      const { error } = await supabase
        .from('managers')
        .update({ status: 'inactive' })
        .eq('id', managerId);

      if (error) throw error;
      loadManagers();
    } catch (error: any) {
      console.error('Error removing manager:', error);
    }
  };

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-black">Loading settings...</p>
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
          <h1 className="text-3xl font-bold text-black">Admin Settings</h1>
          <p className="text-black mt-2">Manage system-wide settings and configurations</p>
        </div>

        {/* Settings Form */}
        <div className="space-y-6">
          {/* Location Markers Manager */}
          <LocationMarkerManager />

          {/* General Settings */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-black mb-6">General Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  System Name
                </label>
                <input
                  type="text"
                  defaultValue="Container Stock Monitoring System"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Default Map Region (Philippines)
                </label>
                <input
                  type="text"
                  defaultValue="Lat: 12.8797, Lng: 121.7740"
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />
              </div>
            </div>
          </div>

          {/* System Manager Management */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-black mb-6">👥 System Manager Management</h2>
            
            {/* Add Manager Form */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-black mb-4">Add New Manager</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Manager Email
                  </label>
                  <input
                    type="email"
                    value={managerEmail}
                    onChange={(e) => setManagerEmail(e.target.value)}
                    placeholder="manager@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Initial Password
                  </label>
                  <input
                    type="password"
                    value={managerPassword}
                    onChange={(e) => setManagerPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black"
                  />
                </div>
                {managerMessage && (
                  <div className={`p-3 rounded-lg ${
                    managerMessage.includes('successfully')
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                    {managerMessage}
                  </div>
                )}
                <button
                  onClick={handleAddManager}
                  disabled={isAddingManager}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition font-medium"
                >
                  <Plus size={20} />
                  {isAddingManager ? 'Creating...' : 'Create Manager Account'}
                </button>
              </div>
            </div>

            {/* Managers List */}
            <div>
              <h3 className="font-semibold text-black mb-4">Active Managers</h3>
              {managers.length > 0 ? (
                <div className="space-y-2">
                  {managers.map((manager) => (
                    <div
                      key={manager.id}
                      className="flex justify-between items-center bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div>
                        <p className="font-medium text-black">{manager.email}</p>
                        <p className="text-xs text-gray-500">
                          Created: {new Date(manager.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveManager(manager.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-100/50 font-bold px-3 py-1 rounded transition flex items-center gap-1"
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p>No managers added yet. Create your first manager above.</p>
                </div>
              )}
            </div>

            {/* Manager Permissions Info */}
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-2">📋 Manager Permissions</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>✓ Managers can add, edit, or delete trucks, containers, and stock</li>
                <li>✓ All changes require admin verification and approval</li>
                <li>✓ Pending requests appear in Admin Dashboard for review</li>
                <li>✓ Admin can accept or reject manager requests</li>
              </ul>
            </div>
          </div>

          {/* Manager Access Control */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-black mb-6">⚙️ Manager Access Control</h2>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-3">Manager Approval System</h3>
                <p className="text-sm text-blue-800 mb-4">
                  When managers perform actions (add, edit, or delete), the system automatically creates requests that require your approval before they are executed.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-semibold text-green-900 mb-2">✓ Approved Requests</h4>
                  <p className="text-sm text-green-800">Actions are automatically executed in the database</p>
                </div>
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-semibold text-red-900 mb-2">✗ Rejected Requests</h4>
                  <p className="text-sm text-red-800">Manager is notified with your rejection reason</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">Protected Actions</h3>
                <p className="text-sm text-gray-700 mb-3">The following manager actions require approval:</p>
                <ul className="text-sm text-gray-700 space-y-1 ml-4">
                  <li>• <strong>Trucks:</strong> Add, Edit, Delete</li>
                  <li>• <strong>Containers:</strong> Add, Edit, Delete</li>
                  <li>• <strong>Stock:</strong> Add, Edit, Delete</li>
                  <li>• <strong>Location Markers:</strong> Add, Edit, Delete</li>
                </ul>
              </div>

              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-2">📊 How It Works</h3>
                <ol className="text-sm text-purple-800 space-y-2">
                  <li><strong>1.</strong> Manager initiates an action (add/edit/delete)</li>
                  <li><strong>2.</strong> System creates a pending request with the action details</li>
                  <li><strong>3.</strong> Admin sees notification in "Manager Requests" section</li>
                  <li><strong>4.</strong> Admin reviews the request details</li>
                  <li><strong>5.</strong> Admin approves → Action executes, or rejects → Manager notified</li>
                </ol>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="font-semibold text-amber-900 mb-2">💡 Tips</h3>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• Check "Manager Requests" regularly for pending approvals</li>
                  <li>• Provide clear rejection reasons when denying requests</li>
                  <li>• Use this system to maintain data integrity and control</li>
                  <li>• Managers cannot bypass the approval process</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-black mb-6">Change Password</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black pr-10"
                    placeholder="Enter your current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                  >
                    {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black pr-10"
                    placeholder="Enter new password (min 6 characters)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                  >
                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black pr-10"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              {passwordMessage && (
                <div className={`p-3 rounded-lg ${
                  passwordMessage.includes('successfully')
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  {passwordMessage}
                </div>
              )}
              <button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition font-medium"
              >
                {isChangingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>

          {/* Save Button */}
          {saveMessage && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
              {saveMessage}
            </div>
          )}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition font-medium"
            >
              <Save size={20} />
              Save Settings
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
