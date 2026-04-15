'use client';

import { Truck, Container } from '@/types';
import { Truck as TruckIcon, Package, TrendingUp } from 'lucide-react';

interface DashboardStatsProps {
  trucks: Truck[];
  containers: Container[];
  totalStocks: number;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  trucks,
  containers,
  totalStocks,
}) => {
  const activeTrucks = trucks.filter((t) => t.status !== 'Idle').length;
  const containersInTransit = containers.filter(
    (c) => c.status === 'In Transit'
  ).length;

  const stats = [
    {
      label: 'Active Trucks',
      value: activeTrucks,
      total: trucks.length,
      icon: TruckIcon,
      color: 'bg-blue-50 text-blue-600 border-blue-200',
    },
    {
      label: 'Containers in Transit',
      value: containersInTransit,
      total: containers.length,
      icon: Package,
      color: 'bg-orange-50 text-orange-600 border-orange-200',
    },
    {
      label: 'Total Stock Items',
      value: totalStocks,
      icon: TrendingUp,
      color: 'bg-green-50 text-green-600 border-green-200',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className={`rounded-lg shadow-md p-6 border border-transparent ${stat.color}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-black">{stat.label}</p>
                <p className="text-3xl font-bold mt-1 text-black">{stat.value}</p>
                {stat.total !== undefined && (
                  <p className="text-xs text-black mt-1">of {stat.total} total</p>
                )}
              </div>
              <Icon className="w-8 h-8" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
