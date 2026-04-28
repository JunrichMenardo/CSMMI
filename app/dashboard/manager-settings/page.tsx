'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { getUserRole } from '@/lib/managerUtils';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Eye, EyeOff } from 'lucide-react';

// Dynamic import for Leaflet component (client-side only)
const LocationMarkerManager = dynamic(
  () => import('@/components/LocationMarkerManager').then(mod => mod.LocationMarkerManager),
  { ssr: false, loading: () => <div className="bg-white rounded-lg shadow-lg p-6 text-center text-gray-600">Loading marker manager...</div> }
);

export default function ManagerSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'manager'>('admin');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Check authentication and role
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/auth');
        return;
      }

      // Check if user is manager
      const role = await getUserRole(data.session.user.id);
      if (role !== 'manager') {
        router.push('/dashboard/settings');
        return;
      }

      setIsAuthenticated(true);
      setUserRole(role);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage('Please fill in all password fields');
      setTimeout(() => setPasswordMessage(''), 3000);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage('New passwords do not match');
      setTimeout(() => setPasswordMessage(''), 3000);
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage('New password must be at least 6 characters');
      setTimeout(() => setPasswordMessage(''), 3000);
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
    } catch (error: any) {
      setPasswordMessage(error.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-xl font-semibold text-gray-700">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar />

      <main className="dashboard-main flex-1 flex flex-col lg:ml-64">
        <Header />

        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <h1 className="text-4xl font-bold text-gray-800">Manager Settings</h1>

          {/* Notice for Managers */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">📋 Manager Account</h3>
            <p className="text-sm text-blue-800">
              As a manager, you can manage location markers, view your account settings, and change your password.
              Any changes you make to trucks, containers, or stock require admin approval.
            </p>
          </div>

          {/* Location Markers Manager */}
          <LocationMarkerManager />

          {/* General Settings */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-black mb-6">General Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Default Map Region
                </label>
                <div className="p-3 bg-gray-100 rounded-lg text-gray-700">
                  Lat: 12.8797, Lng: 121.7740 (Philippines)
                </div>
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
                    placeholder="Enter your current password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  />
                  <button
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-3 text-gray-600 hover:text-gray-900"
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
                    placeholder="Enter your new password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  />
                  <button
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-gray-600 hover:text-gray-900"
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
                    placeholder="Confirm your new password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  />
                  <button
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-gray-600 hover:text-gray-900"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {passwordMessage && (
                <div className={`p-3 rounded-lg text-sm font-medium ${
                  passwordMessage.includes('successfully')
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {passwordMessage}
                </div>
              )}

              <button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors duration-200"
              >
                {isChangingPassword ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
