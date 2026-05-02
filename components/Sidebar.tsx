'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserRole, type UserRole } from '@/lib/managerUtils';
import {
  LayoutDashboard,
  Truck,
  Container,
  Settings,
  Archive,
  ChevronRight,
  Package,
  LogOut,
  Bell,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const role = await getUserRole(session.user.id);
          setUserRole(role);
        }
      } catch (error) {
        console.error('Error checking user role:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, []);

  useEffect(() => {
    const syncSidebarState = () => {
      const shouldOpen = window.innerWidth >= 768;
      setIsSidebarOpen(shouldOpen);
    };

    syncSidebarState();

    const openSidebar = () => setIsSidebarOpen(true);
    const closeSidebar = () => setIsSidebarOpen(false);
    const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

    window.addEventListener('resize', syncSidebarState);
    window.addEventListener('dashboard:open-sidebar', openSidebar);
    window.addEventListener('dashboard:close-sidebar', closeSidebar);
    window.addEventListener('dashboard:toggle-sidebar', toggleSidebar);

    return () => {
      window.removeEventListener('resize', syncSidebarState);
      window.removeEventListener('dashboard:open-sidebar', openSidebar);
      window.removeEventListener('dashboard:close-sidebar', closeSidebar);
      window.removeEventListener('dashboard:toggle-sidebar', toggleSidebar);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('sidebar-collapsed', !isSidebarOpen);
    document.body.classList.toggle('sidebar-open', isSidebarOpen);
    return () => {
      document.body.classList.remove('sidebar-collapsed', 'sidebar-open');
    };
  }, [isSidebarOpen]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.push('/auth');
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  // Different nav items for admin vs manager
  const getNavItems = (): NavItem[] => {
    const commonItems: NavItem[] = [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: <LayoutDashboard size={20} />,
      },
    ];

    if (userRole === 'admin') {
      return [
        ...commonItems,
        {
          label: 'Truck Management',
          href: '/dashboard/trucks',
          icon: <Truck size={20} />,
        },
        {
          label: 'Container Management',
          href: '/dashboard/containers',
          icon: <Container size={20} />,
        },
        {
          label: 'Stock Management',
          href: '/dashboard/stocks',
          icon: <Package size={20} />,
        },
        {
          label: 'Manager Requests',
          href: '/dashboard/notifications',
          icon: <Bell size={20} />,
        },
        {
          label: 'Admin Settings',
          href: '/dashboard/settings',
          icon: <Settings size={20} />,
        },
        {
          label: 'Archive',
          href: '/dashboard/archive',
          icon: <Archive size={20} />,
        },
      ];
    } else {
      // Manager navigation
      return [
        ...commonItems,
        {
          label: 'Truck Management',
          href: '/dashboard/trucks',
          icon: <Truck size={20} />,
        },
        {
          label: 'Container Management',
          href: '/dashboard/containers',
          icon: <Container size={20} />,
        },
        {
          label: 'Stock Management',
          href: '/dashboard/stocks',
          icon: <Package size={20} />,
        },
        {
          label: 'My Requests',
          href: '/dashboard/my-requests',
          icon: <Bell size={20} />,
        },
        {
          label: 'Settings',
          href: '/dashboard/manager-settings',
          icon: <Settings size={20} />,
        },
        {
          label: 'Archive',
          href: '/dashboard/archive',
          icon: <Archive size={20} />,
        },
      ];
    }
  };

  const navItems = getNavItems();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const toggleSidebar = () => {
    window.dispatchEvent(new CustomEvent('dashboard:toggle-sidebar'));
  };

  const closeSidebar = () => {
    window.dispatchEvent(new CustomEvent('dashboard:close-sidebar'));
  };

  return (
    <>
      <div
        className={`fixed inset-0 top-16 bg-black/40 z-20 transition-opacity ${
          isSidebarOpen ? 'opacity-100 pointer-events-auto md:pointer-events-none' : 'opacity-0 pointer-events-none'
        } md:bg-transparent`}
        onClick={toggleSidebar}
      />
      <aside
        className={`dashboard-sidebar w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 z-[9999] shadow-lg overflow-y-auto transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
      {/* Sidebar Header */}
      <div className="p-5 md:p-6 border-b border-slate-700 relative">
        {isSidebarOpen && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800/70 text-white hover:bg-slate-700 transition"
            aria-label="Close navigation menu"
          >
            <span className="text-2xl leading-none font-bold" aria-hidden="true">☰</span>
          </button>
        )}
        <div className="flex items-center gap-3 mb-3">
          <Image
            src="/ease-logistics-logo.svg"
            alt="Ease Logistics logo"
            width={58}
            height={58}
            priority
            className="h-12 w-12 md:h-14 md:w-14 rounded-xl object-contain shadow-md"
          />
          <div>
            <h1 className="text-lg md:text-xl font-bold leading-tight">Ease Logistics</h1>
            <p className="text-[11px] md:text-xs text-slate-400">Truck and stock monitoring</p>
          </div>
        </div>
        {!loading && (
          <div className="inline-block">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              userRole === 'admin' 
                ? 'bg-red-600/30 text-red-200 border border-red-500/50' 
                : 'bg-blue-600/30 text-blue-200 border border-blue-500/50'
            }`}>
              {userRole === 'admin' ? '👨‍💼 Admin' : '👤 Manager'}
            </span>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="p-3 md:p-4 space-y-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeSidebar}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                active
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span
                className={`transition-colors ${
                  active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                {item.icon}
              </span>
              <span className="font-medium flex-1">{item.label}</span>
              {active && <ChevronRight size={16} className="text-black" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer - Logout Button */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700 bg-slate-800 space-y-3">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-500 text-white transition-all duration-200 font-medium"
        >
          <LogOut size={20} />
          <span className="flex-1 text-left">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
        </button>
        <div className="text-xs text-slate-400 space-y-1 pt-2">
          <p>v1.0.0</p>
          <p>© 2026 Ease Logistics</p>
        </div>
      </div>
      </aside>
    </>
  );
};
