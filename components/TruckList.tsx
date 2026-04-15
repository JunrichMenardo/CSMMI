'use client';

import { Truck } from '@/types';
import { MapPin, AlertCircle } from 'lucide-react';

interface TruckListProps {
  trucks: Truck[];
  selectedTruckId: string | null;
  onSelectTruck: (truckId: string) => void;
  loading: boolean;
}

export const TruckList: React.FC<TruckListProps> = ({
  trucks,
  selectedTruckId,
  onSelectTruck,
  loading,
}) => {
  const statusDotColor: Record<string, string> = {
    Idle: 'bg-gray-400',
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
        {trucks.map((truck) => (
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
                <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${statusDotColor[truck.status]}`}></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-black">{truck.name}</p>
                  <p className="text-xs text-black truncate">{truck.driver_name}</p>
                  <div className="flex items-center gap-1 text-xs text-black mt-1">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">
                      {truck.latitude?.toFixed(4)}, {truck.longitude?.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="ml-2 flex-shrink-0">
                <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                  {truck.status}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
