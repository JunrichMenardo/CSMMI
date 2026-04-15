'use client';

import { useState } from 'react';
import { Plus, X, MapPin } from 'lucide-react';
import { createTruck, fetchContainers } from '@/lib/api';
import { Truck, Container } from '@/types';
import { getCityCoordinates } from '@/lib/cities';
import { DestinationMapModal } from './DestinationMapModal';
import { OriginLocationMapModal } from './OriginLocationMapModal';

interface AddTruckFormProps {
  onTruckAdded: (truck: Truck) => void;
}

export const AddTruckForm: React.FC<AddTruckFormProps> = ({ onTruckAdded }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLocationMapOpen, setIsLocationMapOpen] = useState(false);
  const [isDestinationMapOpen, setIsDestinationMapOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [containers, setContainers] = useState<Container[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    driver_name: '',
    status: 'Idle' as const,
    capacity: '1000',
    location: '',
    destination: '',
    container_id: '',
  });

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

  const loadContainers = async () => {
    try {
      const data = await fetchContainers();
      setContainers(data);
    } catch (err) {
      console.error('Failed to load containers:', err);
    }
  };

  const handleOpenModal = () => {
    setIsOpen(true);
    loadContainers();
  };

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
      if (formData.location.includes('|')) {
        const parts = formData.location.split('|');
        latitude = parseFloat(parts[1]);
        longitude = parseFloat(parts[2]);
      } else {
        // Fallback to city name if format is different
        const coords = getCityCoordinates(formData.location);
        latitude = coords.lat;
        longitude = coords.lng;
      }

      // Parse destination if it exists
      let destinationLocation: string | null = null;
      if (formData.destination) {
        if (formData.destination.includes('|')) {
          destinationLocation = formData.destination;
        } else {
          destinationLocation = formData.destination;
        }
      }
      
      const truck = await createTruck({
        name: formData.name,
        driver_name: formData.driver_name,
        status: formData.status,
        latitude,
        longitude,
        capacity: parseInt(formData.capacity),
        current_load: 0,
        route_id: null,
        destination_location: destinationLocation,
      });

      onTruckAdded(truck);
      setFormData({
        name: '',
        driver_name: '',
        status: 'Idle',
        capacity: '1000',
        location: '',
        destination: '',
        container_id: '',
      });
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add truck');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpenModal}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
      >
        <Plus size={20} />
        Add Truck
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
                <h2 className="text-xl font-bold text-black">Add New Truck</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700 transition"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-100 text-red-700 p-3 rounded text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Truck Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Truck Alpha"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black placeholder-gray-400"
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
                  placeholder="e.g., John Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black placeholder-gray-400"
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
                  placeholder="1000"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Starting Location *
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

              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Destination Location
                </label>
                {!formData.location && (
                  <p className="text-sm text-red-600 mb-2">
                    Please select a starting location first
                  </p>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.destination}
                    readOnly
                    placeholder={formData.location ? "Click map button to select" : "Select starting location first"}
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

              <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-4">
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
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
                >
                  {loading ? 'Adding...' : 'Add Truck'}
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
        truckLat={locationData.lat}
        truckLng={locationData.lng}
      />
    </>
  );
};
