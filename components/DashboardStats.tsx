'use client';

import { useEffect, useState } from 'react';
import { Truck, Container, Stock } from '@/types';
import { Truck as TruckIcon, Package, TrendingUp, AlertCircle } from 'lucide-react';
import { getAvailableStock } from '@/lib/inventory';

interface DashboardStatsProps {
  trucks: Truck[];
  containers: Container[];
  totalStocks: number;
  containerStocks?: Map<string, Stock[]>;
  stocks?: Stock[];
}

interface StatItem {
  label: string;
  value: number;
  icon: any;
  color: string;
  total?: number;
  subtext?: string;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  trucks,
  containers,
  totalStocks,
  containerStocks = new Map(),
  stocks = [],
}) => {
  const [availableStock, setAvailableStock] = useState<number>(0);

  // Fetch available stock from central inventory
  useEffect(() => {
    const fetchInventory = async () => {
      const available = await getAvailableStock();
      setAvailableStock(available);
    };
    
    fetchInventory();
  }, []);

  // Calculate truck status dynamically
  const calculateTruckStatus = (truck: Truck): string => {
    const assignedContainers = containers.filter((c) => c.truck_id === truck.id);
    if (assignedContainers.length === 0) {
      return 'Idle';
    }

    // Check if any assigned container has stocks
    const containerIds = assignedContainers.map((c) => c.id);
    const containersWithStocks = stocks.filter((s): s is Stock & { container_id: string } => 
      s.container_id !== null && containerIds.includes(s.container_id)
    );
    return containersWithStocks.length > 0 ? 'Delivering' : 'Getting Stocks';
  };

  // Calculate container status based on truck assignment and stocks
  const calculateContainerStatus = (container: Container, stocks: Stock[]): string => {
    // If marked as delivered
    if (container.status === 'Delivered') {
      return 'Delivered';
    }

    const hasStocks = stocks.length > 0;
    const hasAssignedTruck = !!container.truck_id;

    // If has truck assigned
    if (hasAssignedTruck) {
      return 'In Transit';
    }
    // If has stocks but no truck
    if (hasStocks) {
      return 'Stored';
    }
    // No truck and no stocks
    return 'Available';
  };

  // Get the dynamic status for a container
  const getContainerStatus = (container: Container): string => {
    const stocks = containerStocks.get(container.id) || [];
    return calculateContainerStatus(container, stocks);
  };

  // Calculate active stocks (not delivered)
  const activeContainers = containers.filter(
    (c) => c.status !== 'Delivered'
  );

  const deliveredContainers = containers.filter(
    (c) => c.status === 'Delivered'
  );

  // Calculate stock quantities
  // Total Stock Items = all items in containers that are NOT delivered
  const activeStocksQuantity = stocks
    .filter((s) => {
      const container = containers.find((c) => c.id === s.container_id);
      return container && container.status !== 'Delivered';
    })
    .reduce((sum, stock) => sum + stock.quantity, 0);

  const deliveredStocksQuantity = stocks
    .filter((s) => {
      const container = containers.find((c) => c.id === s.container_id);
      return container && container.status === 'Delivered';
    })
    .reduce((sum, stock) => sum + stock.quantity, 0);

  const activeTrucks = trucks.filter((t) => calculateTruckStatus(t) !== 'Idle').length;
  const containersInTransit = activeContainers.filter(
    (c) => {
      const status = getContainerStatus(c);
      return status === 'In Transit';
    }
  ).length;

  const stats: StatItem[] = [
    {
      label: 'Active Trucks',
      value: activeTrucks,
      total: trucks.length,
      icon: TruckIcon,
      color: 'bg-blue-50 text-blue-600 border-blue-200',
    },
    {
      label: 'Total Stock Items',
      value: availableStock,
      ...(deliveredStocksQuantity > 0 && { subtext: `${deliveredStocksQuantity} delivered` }),
      icon: Package,
      color: 'bg-green-50 text-green-600 border-green-200',
    },
    {
      label: 'Containers in Transit',
      value: containersInTransit,
      total: activeContainers.length,
      ...(deliveredContainers.length > 0 && { subtext: `${deliveredContainers.length} delivered` }),
      icon: TrendingUp,
      color: 'bg-orange-50 text-orange-600 border-orange-200',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className={`rounded-lg shadow-md p-6 border ${stat.color}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-black">{stat.label}</p>
                <p className="text-3xl font-bold mt-1 text-black">{stat.value}</p>
                {stat.total !== undefined && (
                  <p className="text-xs text-black mt-1">of {stat.total} total</p>
                )}
                {stat.subtext && (
                  <p className="text-xs text-gray-600 mt-1 font-medium">{stat.subtext}</p>
                )}
              </div>
              <Icon className="w-8 h-8 flex-shrink-0" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
