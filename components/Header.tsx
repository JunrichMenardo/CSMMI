'use client';

import { BarChart3 } from 'lucide-react';

interface HeaderProps {
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Ease Logistics',
}) => {
  const toggleSidebar = () => {
    window.dispatchEvent(new CustomEvent('dashboard:toggle-sidebar'));
  };

  return (
    <header className="bg-gradient-to-r from-blue-600 to-indigo-900 text-white shadow-lg sticky top-0 z-30">
      <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSidebar}
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition shadow-sm"
            aria-label="Open navigation menu"
          >
            <span className="text-2xl leading-none font-bold" aria-hidden="true">☰</span>
          </button>
          <BarChart3 className="hidden sm:block w-7 h-7 sm:w-8 sm:h-8" />
          <h1 className="text-lg sm:text-2xl font-bold truncate">{title}</h1>
        </div>
      </div>
    </header>
  );
};
