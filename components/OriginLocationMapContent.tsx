'use client';

import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getNearestCity } from '@/lib/cities';

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

interface OriginLocationMapContentProps {
  onLocationClick: (data: { city: string; lat: number; lng: number }) => void;
}

export default function OriginLocationMapContent({
  onLocationClick,
}: OriginLocationMapContentProps) {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

  const handleMapClick = (city: string, lat: number, lng: number) => {
    onLocationClick({ city, lat, lng });
    setSelectedLocation({ lat, lng });
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

      {/* Selected location marker */}
      {selectedLocation && (
        <Marker position={[selectedLocation.lat, selectedLocation.lng]} icon={defaultIcon}>
          <Popup autoPan={true}>
            <div style={{ color: '#000', fontWeight: '500', textAlign: 'center' }}>
              <div>📍 Selected Location</div>
              <div style={{ fontSize: '0.85rem', marginTop: '4px', color: '#666' }}>
                {parseFloat(selectedLocation.lat.toFixed(4))}, {parseFloat(selectedLocation.lng.toFixed(4))}
              </div>
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
