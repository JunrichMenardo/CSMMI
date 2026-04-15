'use client';

import { useEffect, useState } from 'react';
import { Truck, Container } from '@/types';
import { fetchContainersByTruck } from '@/lib/api';
import { MapPin, Truck as TruckIcon, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface TruckDetailsProps {
  truck: Truck;
}

export const TruckDetails: React.FC<TruckDetailsProps> = ({ truck }) => {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContainers = async () => {
      try {
        const data = await fetchContainersByTruck(truck.id);
        setContainers(data);
      } catch (err) {
        console.error('Failed to load containers:', err);
      } finally {
        setLoading(false);
      }
    };

    loadContainers();
  }, [truck.id]);

  const statusColors: Record<string, string> = {
    Idle: 'bg-gray-100 text-gray-800',
    Delivering: 'bg-blue-100 text-blue-800',
    Returning: 'bg-orange-100 text-orange-800',
  };

  const containerStatusColors: Record<string, string> = {
    Loaded: 'bg-green-100 text-green-800',
    'In Transit': 'bg-yellow-100 text-yellow-800',
    Delivered: 'bg-blue-100 text-blue-800',
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 h-full overflow-y-auto">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-black">
        <TruckIcon className="w-6 h-6" />
        Truck Details
      </h2>

      <div className="space-y-4">
        {/* Truck Information */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="font-semibold text-lg mb-3 text-black">{truck.name}</h3>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-black">Driver</p>
              <p className="font-medium text-black">{truck.driver_name}</p>
            </div>

            <div>
              <p className="text-black">Status</p>
              <p className={`inline-block px-2 py-1 rounded text-xs font-semibold ${statusColors[truck.status]}`}>
                {truck.status}
              </p>
            </div>

            <div className="col-span-2">
              <p className="text-black flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                Location
              </p>
              <p className="font-medium text-black">
                {truck.latitude?.toFixed(6)}, {truck.longitude?.toFixed(6)}
              </p>
            </div>

            <div className="col-span-2">
              <p className="text-black">Last Updated</p>
              <p className="font-medium text-black">
                {format(new Date(truck.updated_at), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
          </div>
        </div>

        {/* Containers */}
        <div>
          <h3 className="font-semibold text-lg mb-3 text-black">Assigned Containers</h3>

          {loading ? (
            <p className="text-black">Loading containers...</p>
          ) : containers.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">No containers assigned</p>
            </div>
          ) : (
            <div className="space-y-2">
              {containers.map((container) => (
                <div
                  key={container.id}
                  className="border rounded-lg p-3 hover:bg-gray-50 transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm text-black">{container.container_number}</p>
                      <p className="text-xs text-black">
                        ID: {container.id.slice(0, 8)}...
                      </p>
                    </div>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold ${containerStatusColors[container.status]}`}
                    >
                      {container.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
