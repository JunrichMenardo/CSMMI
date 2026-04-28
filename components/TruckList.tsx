'use client';

import { Truck, Container, Stock } from '@/types';
import { MapPin, AlertCircle, Package } from 'lucide-react';

interface TruckListProps {
  trucks: Truck[];
  containers: Container[];
  stocks: Stock[];
  selectedTruckId: string | null;
  onSelectTruck: (truckId: string) => void;
  loading: boolean;
}

export const TruckList: React.FC<TruckListProps> = ({
  trucks,
  containers,
  stocks,
  selectedTruckId,
  onSelectTruck,
  loading,
}) => {
  // Calculate truck status dynamically
  const calculateTruckStatus = (truck: Truck): Truck['status'] => {
    const assignedContainers = containers.filter((c) => c.truck_id === truck.id);
    if (assignedContainers.length === 0) {
      return 'Idle';
    }

    // Check if any assigned container has stocks
    const containerIds = assignedContainers.map((c) => c.id);
    const containersWithStocks = stocks.filter((s) => s.container_id && containerIds.includes(s.container_id));
    return containersWithStocks.length > 0 ? 'Active' : 'Idle';
  };

  // Calculate total stock items for a truck
  const getTruckStockTotal = (truck: Truck): number => {
    const assignedContainers = containers.filter((c) => c.truck_id === truck.id);
    const containerIds = assignedContainers.map((c) => c.id);
    return stocks
      .filter((s) => s.container_id && containerIds.includes(s.container_id) && assignedContainers.find(c => c.id === s.container_id)?.status !== 'Delivered')
      .reduce((sum, stock) => sum + stock.quantity, 0);
  };

  // Get number of containers for a truck
  const getTruckContainerCount = (truck: Truck): number => {
    return containers.filter((c) => c.truck_id === truck.id && c.status !== 'Delivered').length;
  };

  const statusDotColor: Record<string, string> = {
    Idle: 'bg-gray-400',
    'Getting Stocks': 'bg-yellow-500',
    Delivering: 'bg-blue-500',
    Returning: 'bg-orange-500',
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <p className="text-black">Loading trucks...</p>
      </div>
    );
  }

  if (trucks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-black">No Trucks Available</p>
            <p className="text-sm text-black">Add trucks to get started</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-lg font-semibold mb-4 text-black">Active Trucks ({trucks.length})</h2>

      <div className="space-y-2">
        {trucks.map((truck) => {
          const stockTotal = getTruckStockTotal(truck);
          const containerCount = getTruckContainerCount(truck);
          
          return (
            <button
              key={truck.id}
              onClick={() => onSelectTruck(truck.id)}
              className={`w-full text-left p-3 rounded-lg border-2 transition ${
                selectedTruckId === truck.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${statusDotColor[calculateTruckStatus(truck)]}`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-black">{truck.name}</p>
                    <p className="text-xs text-black truncate">{truck.driver_name}</p>
                    <div className="flex items-center gap-1 text-xs text-black mt-1">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">
                        {truck.latitude?.toFixed(4)}, {truck.longitude?.toFixed(4)}
                      </span>
                    </div>
                    {(stockTotal > 0 || containerCount > 0) && (
                      <div className="flex items-center gap-2 text-xs text-gray-700 mt-2">
                        <Package className="w-3 h-3" />
                        <span><strong>{stockTotal}</strong> items in <strong>{containerCount}</strong> container{containerCount !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="ml-2 flex-shrink-0">
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                    {calculateTruckStatus(truck)}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
