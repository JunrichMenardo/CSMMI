'use client';

import { useState, useEffect } from 'react';
import { Edit, X, Trash2, MapPin } from 'lucide-react';
import { updateTruck, updateContainer, fetchContainers, fetchStocks, fetchStocksByContainer, deleteTruck } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { getUserRole, createManagerRequest, getManagerId } from '@/lib/managerUtils';
import { Truck, Container, Stock } from '@/types';
import { getCityCoordinates, getNearestCity } from '@/lib/cities';
import { DestinationMapModal } from './DestinationMapModal';
import { OriginLocationMapModal } from './OriginLocationMapModal';

interface EditTruckFormProps {
  truck: Truck;
  onTruckUpdated: (truck: Truck) => void;
}

export const EditTruckForm: React.FC<EditTruckFormProps> = ({
  truck,
  onTruckUpdated,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLocationMapOpen, setIsLocationMapOpen] = useState(false);
  const [isDestinationMapOpen, setIsDestinationMapOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [containers, setContainers] = useState<Container[]>([]);
  const [assignedContainers, setAssignedContainers] = useState<Container[]>([]);
  const [availableContainers, setAvailableContainers] = useState<Container[]>([]);
  const [selectedContainerToAssign, setSelectedContainerToAssign] = useState<string>('');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [originLocation, setOriginLocation] = useState<string>(
    `${getNearestCity(truck.latitude, truck.longitude)}|${truck.latitude}|${truck.longitude}`
  );
  const [formData, setFormData] = useState({
    name: truck.name,
    driver_name: truck.driver_name || '',
    capacity: truck.capacity.toString(),
    destination_location: truck.destination_location || '',
  });

  useEffect(() => {
    if (isOpen) {
      loadContainers();
    }
  }, [isOpen]);

  const loadContainers = async () => {
    try {
      const [containersData, stocksData] = await Promise.all([
        fetchContainers(),
        fetchStocks(),
      ]);
      setContainers(containersData);
      setStocks(stocksData);
      // Find containers assigned to this truck
      const assigned = containersData.filter((c) => c.truck_id === truck.id);
      setAssignedContainers(assigned);
      // Available containers are those not assigned to any truck
      const available = containersData.filter((c) => !c.truck_id);
      setAvailableContainers(available);
    } catch (err) {
      console.error('Failed to load containers:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDestinationSelect = (destination: string) => {
    setFormData((prev) => ({
      ...prev,
      destination_location: destination,
    }));
  };

  const handleOriginSelect = (location: string) => {
    setOriginLocation(location);
  };

  // Parse location string format: "city|lat|lng"
  const parseLocationString = (locationStr: string) => {
    if (!locationStr || !locationStr.includes('|')) {
      return { city: locationStr, lat: truck.latitude, lng: truck.longitude };
    }
    const parts = locationStr.split('|');
    return { city: parts[0], lat: parseFloat(parts[1]), lng: parseFloat(parts[2]) };
  };

  const originLocationData = parseLocationString(originLocation);
  const destinationLocationData = parseLocationString(formData.destination_location);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check user role
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setError('You must be logged in');
        setLoading(false);
        return;
      }

      const userRole = await getUserRole(session.user.id);

      // Parse location string if it exists, otherwise keep current coordinates
      let latitude = truck.latitude;
      let longitude = truck.longitude;

      if (originLocation && originLocation.includes('|')) {
        const parts = originLocation.split('|');
        latitude = parseFloat(parts[1]);
        longitude = parseFloat(parts[2]);
      }

      // Calculate status based on assigned containers and their stocks
      let status: Truck['status'] = 'Idle';
      if (assignedContainers.length > 0) {
        // Check if any assigned container has stocks
        const containerIds = assignedContainers.map((c) => c.id);
        const containersWithStocks = stocks.filter((s) => s.container_id && containerIds.includes(s.container_id));
        status = containersWithStocks.length > 0 ? 'Active' : 'Idle';
      }

      const updatedTruckData = {
        name: formData.name,
        driver_name: formData.driver_name,
        status,
        capacity: parseInt(formData.capacity),
        latitude,
        longitude,
        destination_location: formData.destination_location || null,
      };

      // Manager: Create request instead of direct action
      if (userRole === 'manager') {
        const managerId = await getManagerId(session.user.id);
        if (!managerId) {
          setError('Manager account not found');
          setLoading(false);
          return;
        }

        const created = await createManagerRequest(
          managerId,
          'edit_truck',
          'truck',
          updatedTruckData,
          truck.id
        );

        if (created) {
          setError(null);
          setIsOpen(false);
          alert('✅ Edit request submitted for admin approval!\n\nYour changes will be applied after the admin reviews and approves your request.');
          onTruckUpdated(truck); // Keep current truck displayed until approved
        } else {
          setError('Failed to submit request');
        }
        return;
      }

      // Admin: Update truck directly
      const updatedTruck = await updateTruck(truck.id, updatedTruckData);

      onTruckUpdated(updatedTruck);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update truck');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this truck?')) {
      return;
    }

    try {
      // Check user role
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setError('You must be logged in');
        return;
      }

      const userRole = await getUserRole(session.user.id);

      // Manager: Create delete request
      if (userRole === 'manager') {
        const managerId = await getManagerId(session.user.id);
        if (!managerId) {
          setError('Manager account not found');
          return;
        }

        const created = await createManagerRequest(
          managerId,
          'delete_truck',
          'truck',
          { id: truck.id },
          truck.id
        );

        if (created) {
          setIsOpen(false);
          alert('✅ Delete request submitted for admin approval!\n\nThe truck will be deleted after the admin reviews and approves your request.');
        } else {
          setError('Failed to submit request');
        }
        return;
      }

      // Admin: Delete truck directly
      await deleteTruck(truck.id);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete truck');
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
        title="Edit truck"
      >
        <Edit size={18} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop with transparency */}
          <div
            className="fixed inset-0 bg-black/20 z-40 transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Centered Modal Popup */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
              <div className="sticky top-0 flex items-center justify-between p-6 border-b bg-white rounded-t-xl">
                <h2 className="text-xl font-bold text-black">Edit Truck</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700 transition"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-100 text-red-700 p-3 rounded text-sm">
                  {error}
                </div>
              )}

              {/* Truck Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-black text-lg">Truck Details</h3>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Truck Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Driver Name
                  </label>
                  <input
                    type="text"
                    name="driver_name"
                    value={formData.driver_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Capacity (units)
                  </label>
                  <input
                    type="number"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Truck status will be automatically set based on assigned containers.
                  </p>
                </div>
              </div>

              {/* Location Information (Editable with Maps) */}
              <div className="space-y-4">
                <h3 className="font-semibold text-black text-lg">Location Information</h3>

                {/* Current Coordinates (Read-Only) */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Current Coordinates</label>
                    <p className="text-black text-sm mt-1">
                      Latitude: {originLocationData.lat?.toFixed(4) || truck.latitude?.toFixed(4) || 'N/A'}
                    </p>
                    <p className="text-black text-sm">
                      Longitude: {originLocationData.lng?.toFixed(4) || truck.longitude?.toFixed(4) || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Starting Point (Origin Location) - With Map */}
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Starting Point
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsLocationMapOpen(true)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black hover:bg-gray-50 flex items-center justify-center gap-2 transition font-medium"
                  >
                    <MapPin size={18} />
                    {originLocationData.city ? originLocationData.city : 'Click Map to Select Starting Point'}
                  </button>
                  <p className="text-xs text-gray-600 mt-1">Click map button to select where the truck starts from</p>
                </div>

                {/* Destination Location - With Map */}
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Destination Location
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.destination_location}
                      readOnly
                      placeholder="Click map button to select destination"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-black placeholder-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => setIsDestinationMapOpen(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-1"
                    >
                      <MapPin size={18} />
                      Map
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Where the truck is heading</p>
                </div>
              </div>

              {/* Assigned Containers */}
              <div className="space-y-4">
                <h3 className="font-semibold text-black text-lg">Assigned Containers</h3>
                
                {/* Assign new container */}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-black mb-2">Assign Container</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedContainerToAssign}
                      onChange={(e) => setSelectedContainerToAssign(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-black"
                    >
                      <option value="">Select container to assign</option>
                      {availableContainers.map((c) => (
                        <option key={c.id} value={c.id}>{c.container_number}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!selectedContainerToAssign) return alert('Please select a container to assign');
                        try {
                          setLoading(true);
                          // Assign the container to this truck
                          await updateContainer(selectedContainerToAssign, { truck_id: truck.id });
                          // Reload containers
                          await loadContainers();
                          setSelectedContainerToAssign('');
                        } catch (e) {
                          console.error('Failed to assign container:', e);
                          alert('Failed to assign container');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Assign
                    </button>
                  </div>
                </div>

                {assignedContainers.length === 0 ? (
                  <p className="text-black text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                    No containers assigned to this truck
                  </p>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 max-h-64 overflow-y-auto">
                    {assignedContainers.map((container) => (
                      <div
                        key={container.id}
                        className="bg-white p-3 rounded border border-gray-200 flex items-center justify-between"
                      >
                        <span className="font-medium text-black">{container.container_number}</span>
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                          Assigned
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 sticky bottom-0 bg-white pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-black rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                >
                  {loading ? 'Updating...' : 'Update Truck'}
                </button>
              </div>

            </form>
            </div>
          </div>
        </>
      )}

      <OriginLocationMapModal
        isOpen={isLocationMapOpen}
        onClose={() => setIsLocationMapOpen(false)}
        onSelectLocation={handleOriginSelect}
        currentLocation={originLocation}
      />

      <DestinationMapModal
        isOpen={isDestinationMapOpen}
        onClose={() => setIsDestinationMapOpen(false)}
        onSelectDestination={handleDestinationSelect}
        currentDestination={formData.destination_location}
        truckLat={originLocationData.lat}
        truckLng={originLocationData.lng}
      />
    </>
  );
};
