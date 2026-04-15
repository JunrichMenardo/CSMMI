'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Truck,
  Container,
  Settings,
  Archive,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: <LayoutDashboard size={20} />,
    },
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

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 shadow-lg overflow-y-auto">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">CSM</span>
          </div>
          <span className="text-lg">Container Stock Monitor</span>
        </h1>
      </div>

      {/* Navigation Items */}
      <nav className="p-4 space-y-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
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

      {/* Footer Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700 bg-slate-800">
        <div className="text-xs text-slate-400 space-y-1">
          <p>v1.0.0</p>
          <p>© 2026 Container Stock Monitor</p>
        </div>
      </div>
    </aside>
  );
};
