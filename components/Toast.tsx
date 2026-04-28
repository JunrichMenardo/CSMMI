'use client';

import { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bgColor = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
  }[type];

  const textColor = {
    success: 'text-green-800',
    error: 'text-red-800',
    info: 'text-blue-800',
  }[type];

  const iconColor = {
    success: 'text-green-600',
    error: 'text-red-600',
    info: 'text-blue-600',
  }[type];

  return (
    <div
      className={`fixed top-4 right-4 ${bgColor} border rounded-lg p-4 shadow-lg flex items-start gap-3 z-50 max-w-sm animate-in fade-in slide-in-from-right`}
    >
      {type === 'success' && <CheckCircle className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />}
      {type === 'error' && <AlertCircle className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />}
      {type === 'info' && <AlertCircle className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />}
      <span className={`text-sm font-medium ${textColor}`}>{message}</span>
      <button
        onClick={onClose}
        className={`flex-shrink-0 ${textColor} hover:opacity-70`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
