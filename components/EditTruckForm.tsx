'use client';

import { useState, useEffect } from 'react';
import { Edit, X, MapPin } from 'lucide-react';
import { updateTruck, fetchContainers } from '@/lib/api';
import { Truck, Container } from '@/types';
import { getCityCoordinates, getCityList } from '@/lib/cities';
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
  const [formData, setFormData] = useState({
    name: truck.name,
    driver_name: truck.driver_name || '',
    status: truck.status,
    capacity: truck.capacity.toString(),
    location: '',
    destination: truck.destination_location || '',
    container_id: '',
  });

  // Determine initial location from coordinates
  useEffect(() => {
    if (isOpen) {
      loadContainers();
      // Find which city matches the truck's current coordinates
      const cities = getCityList();
      let foundCity = '';
      
      for (const city of cities) {
        const coords = getCityCoordinates(city);
        if (Math.abs(coords.lat - truck.latitude) < 0.01 && 
            Math.abs(coords.lng - truck.longitude) < 0.01) {
          foundCity = city;
          break;
        }
      }
      
      setFormData(prev => ({
        ...prev,
        location: foundCity || '',
      }));
    }
  }, [isOpen, truck]);

  const loadContainers = async () => {
    try {
      const data = await fetchContainers();
      setContainers(data);
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
      destination,
    }));
  };

  // Parse location string format: "city|lat|lng"
  const parseLocationString = (locationStr: string) => {
    if (!locationStr || !locationStr.includes('|')) {
      return { city: locationStr, lat: undefined, lng: undefined };
    }
    const parts = locationStr.split('|');
    return { city: parts[0], lat: parseFloat(parts[1]), lng: parseFloat(parts[2]) };
  };

  const locationData = parseLocationString(formData.location);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.location) {
      setError('Starting location is required. Please select a location on the map.');
      setLoading(false);
      return;
    }

    try {
      // Parse location string format: "city|lat|lng"
      let latitude: number, longitude: number;
      if (locationData.lat !== undefined && locationData.lng !== undefined) {
        latitude = locationData.lat;
        longitude = locationData.lng;
      } else {
        // Fallback to city name if format is different
        const coords = getCityCoordinates(formData.location);
        latitude = coords.lat;
        longitude = coords.lng;
      }

      // Parse destination if it exists
      let destinationLocation: string | null = null;
      if (formData.destination) {
        destinationLocation = formData.destination;
      }

      const updatedTruck = await updateTruck(truck.id, {
        name: formData.name,
        driver_name: formData.driver_name,
        status: formData.status as 'Active' | 'Idle' | 'Maintenance',
        latitude,
        longitude,
        capacity: parseInt(formData.capacity),
        destination_location: destinationLocation,
      });

      onTruckUpdated(updatedTruck);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update truck');
    } finally {
      setLoading(false);
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
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black"
                  >
                    <option value="Active">Active</option>
                    <option value="Idle">Idle</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Current Location *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsLocationMapOpen(true)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black hover:bg-gray-50 flex items-center justify-center gap-2 transition font-medium"
                  >
                    <MapPin size={18} />
                    {locationData.city ? locationData.city : 'Click Map to Select Location'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Destination Location
                </label>
                {!formData.location && (
                  <p className="text-sm text-red-600 mb-2">
                    Please select a current location first
                  </p>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.destination}
                    readOnly
                    placeholder={formData.location ? "Click map button to select" : "Select current location first"}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-black placeholder-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setIsDestinationMapOpen(true)}
                    disabled={!formData.location}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition flex items-center gap-1"
                  >
                    <MapPin size={18} />
                    Map
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Assign Container
                </label>
                <select
                  name="container_id"
                  value={formData.container_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black"
                >
                  <option value="">Select container (optional)</option>
                  {containers.map((container) => (
                    <option key={container.id} value={container.id}>
                      {container.container_number}
                    </option>
                  ))}
                </select>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 sticky bottom-0 bg-white pb-4">
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
        onSelectLocation={(city) => setFormData(prev => ({...prev, location: city}))}
        currentLocation={formData.location}
      />

      <DestinationMapModal
        isOpen={isDestinationMapOpen}
        onClose={() => setIsDestinationMapOpen(false)}
        onSelectDestination={handleDestinationSelect}
        currentDestination={formData.destination}
        truckLat={locationData.lat || truck.latitude}
        truckLng={locationData.lng || truck.longitude}
      />
    </>
  );
};
