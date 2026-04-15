'use client';

import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getNearestCity } from '@/lib/cities';

// Fetch road route from OSRM API
const fetchRoadRoute = async (
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<[number, number][]> => {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
    );
    const data = await response.json();
    if (data.routes && data.routes.length > 0) {
      const coordinates = data.routes[0].geometry.coordinates;
      return coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
    }
  } catch (error) {
    console.error('Failed to fetch road route:', error);
  }
  return [];
};

// Truck SVG Icon
const getTruckIcon = () => {
  return new L.DivIcon({
    html: `
      <div style="display: flex; align-items: center; justify-content: center;">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="12" width="12" height="14" fill="#3b82f6" stroke="#1e40af" stroke-width="2" rx="2"/>
          <rect x="16" y="10" width="20" height="16" fill="#60a5fa" stroke="#1e40af" stroke-width="2" rx="2"/>
          <circle cx="8" cy="28" r="3" fill="#1e40af"/>
          <circle cx="20" cy="28" r="3" fill="#1e40af"/>
          <circle cx="32" cy="28" r="3" fill="#1e40af"/>
          <rect x="6" y="14" width="8" height="6" fill="#87ceeb" rx="1"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

// Default marker icon
const defaultIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Click handler component
const MapClickHandler: React.FC<{
  onLocationClick: (city: string, lat: number, lng: number) => void;
}> = ({ onLocationClick }) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      const nearestCity = getNearestCity(lat, lng);
      onLocationClick(nearestCity, lat, lng);
    },
  });
  return null;
};

interface DestinationMapContentProps {
  truckLat?: number;
  truckLng?: number;
  onLocationClick: (data: { city: string; lat: number; lng: number }) => void;
}

export default function DestinationMapContent({
  truckLat,
  truckLng,
  onLocationClick,
}: DestinationMapContentProps) {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);

  const handleMapClick = async (city: string, lat: number, lng: number) => {
    onLocationClick({ city, lat, lng });
    setSelectedLocation({ lat, lng });

    // Fetch route if truck location exists
    if (truckLat !== undefined && truckLng !== undefined) {
      const route = await fetchRoadRoute(truckLat, truckLng, lat, lng);
      setRoutePath(route);
    }
  };

  const defaultCenter: [number, number] = [12.8797, 121.7740];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={7}
      minZoom={6}
      maxZoom={18}
      style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      
      <MapClickHandler onLocationClick={handleMapClick} />

      {/* Truck location marker */}
      {truckLat !== undefined && truckLng !== undefined && (
        <Marker position={[truckLat, truckLng]} icon={getTruckIcon()}>
          <Popup>
            <div style={{ color: '#000', fontWeight: '500' }}>Truck Current Location</div>
          </Popup>
        </Marker>
      )}

      {/* Selected destination marker */}
      {selectedLocation && (
        <Marker position={[selectedLocation.lat, selectedLocation.lng]} icon={defaultIcon}>
          <Popup autoPan={true}>
            <div style={{ color: '#000', fontWeight: '500', textAlign: 'center' }}>
              <div>📍 Selected Destination</div>
              <div style={{ fontSize: '0.85rem', marginTop: '4px', color: '#666' }}>
                {parseFloat(selectedLocation.lat.toFixed(4))}, {parseFloat(selectedLocation.lng.toFixed(4))}
              </div>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Route line */}
      {routePath.length > 0 && (
        <Polyline positions={routePath} color="#ef4444" weight={3} opacity={0.7} dashArray="5, 5" />
      )}
    </MapContainer>
  );
}
