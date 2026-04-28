'use client';

import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { useLocationMarkers } from '@/hooks/useLocationMarkers';

interface DestinationMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDestination: (destination: string) => void;
  currentDestination?: string;
  truckLat?: number;
  truckLng?: number;
  customMarkers?: Array<{ id: string; lat: number; lng: number; name: string; type: 'port' | 'store' | 'plant' }>;
}

export const DestinationMapModal: React.FC<DestinationMapModalProps> = ({
  isOpen,
  onClose,
  onSelectDestination,
  currentDestination,
  truckLat,
  truckLng,
  customMarkers = [],
}) => {
  const [selectedCity, setSelectedCity] = useState<string | null>(currentDestination || null);
  const [isMounted, setIsMounted] = useState(false);
  const { markers: sharedMarkers } = useLocationMarkers();
  
  // Merge custom markers with shared markers
  const allMarkers = [...sharedMarkers, ...customMarkers];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleConfirm = () => {
    if (selectedCity) {
      onSelectDestination(selectedCity);
      setSelectedCity(null);
      onClose();
    }
  };

  const handleLocationClick = (data: { city: string; lat: number; lng: number }) => {
    const locationString = `${data.city}|${data.lat}|${data.lng}`;
    setSelectedCity(locationString);
  };

  if (!isOpen || !isMounted) return null;

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .dest-modal-container {
            width: 100vw !important;
            height: 100vh !important;
            border-radius: 0 !important;
            max-width: 100% !important;
          }
          .dest-modal-header {
            padding: 1rem !important;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem !important;
          }
          .dest-modal-header h2 {
            font-size: 1rem !important;
          }
          .dest-modal-header button {
            position: absolute;
            right: 1rem;
            top: 1rem;
          }
          .dest-modal-quickselect {
            max-height: 100px !important;
            padding: 0.75rem !important;
          }
          .dest-modal-quickselect p {
            font-size: 0.75rem !important;
            margin-bottom: 0.5rem !important;
          }
          .dest-modal-button {
            padding: 0.5rem 0.5rem !important;
            font-size: 0.75rem !important;
            min-height: 44px;
            min-width: 44px;
          }
          .dest-modal-footer {
            padding: 1rem !important;
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem !important;
          }
          .dest-modal-footer button {
            padding: 0.75rem 1rem !important;
            font-size: 0.875rem !important;
            min-height: 44px;
            width: 100%;
          }
          .dest-modal-footer > div:first-child p {
            font-size: 0.75rem !important;
          }
        }
      `}</style>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }} />
      
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div onClick={(e) => e.stopPropagation()} className="dest-modal-container" style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 20px 25px rgba(0,0,0,0.1)', width: '95vw', height: '90vh', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* Header */}
          <div className="dest-modal-header" style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin style={{ color: '#2563eb' }} size={24} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#000' }}>Select Destination</h2>
            </div>
            <button onClick={onClose} style={{ color: '#9ca3af', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
          </div>

          {/* Map Container - takes all remaining space */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', width: '100%', minHeight: 0 }}>
            {isMounted && (
              <>
                <MapComponent 
                  truckLat={truckLat}
                  truckLng={truckLng}
                  onLocationClick={handleLocationClick}
                />
                {!selectedCity && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}>
                    <div style={{ background: '#2563eb', color: 'white', padding: '1rem 1.5rem', borderRadius: '0.5rem', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                      <p style={{ fontWeight: '600', margin: '0 0 0.25rem 0' }}>Click on map to select destination</p>
                      <p style={{ fontSize: '0.875rem', margin: 0, opacity: 0.9 }}>Scroll to zoom • Drag to pan</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Custom Markers Section */}
          {allMarkers.length > 0 && (
            <div className="dest-modal-quickselect" style={{ padding: '0.75rem', borderTop: '1px solid #e5e7eb', background: '#f0f9ff', flexShrink: 0, overflow: 'auto', maxHeight: '100px' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#000', margin: '0 0 0.75rem 0' }}>Quick Select Locations:</p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {allMarkers.map((marker) => {
                  const typeEmojis = { port: '⚓', store: '🏪', plant: '🏭' };
                  const markerString = `${marker.name}|${marker.lat}|${marker.lng}`;
                  const isSelected = selectedCity === markerString;
                  return (
                    <button
                      key={marker.id}
                      className="dest-modal-button"
                      onClick={() => setSelectedCity(markerString)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        border: isSelected ? '2px solid #2563eb' : '1px solid #d1d5db',
                        background: isSelected ? '#dbeafe' : 'white',
                        color: '#000',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: isSelected ? '600' : '500',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s'
                      }}
                    >
                      {typeEmojis[marker.type]} {marker.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="dest-modal-footer" style={{ padding: '1.5rem', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              {selectedCity && <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#000', margin: 0 }}>Selected: <span style={{ color: '#2563eb' }}>{selectedCity.includes('|') ? selectedCity.split('|')[0] : selectedCity}</span></p>}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={onClose} style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', color: '#000', borderRadius: '0.5rem', background: 'white', cursor: 'pointer', fontWeight: '500' }}>Cancel</button>
              <button onClick={handleConfirm} disabled={!selectedCity} style={{ padding: '0.5rem 1rem', background: selectedCity ? '#2563eb' : '#d1d5db', color: 'white', borderRadius: '0.5rem', border: 'none', cursor: selectedCity ? 'pointer' : 'not-allowed', fontWeight: '500' }}>Confirm</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Simple inline map component
function MapComponent(props: { truckLat?: number; truckLng?: number; onLocationClick: (data: { city: string; lat: number; lng: number }) => void }) {
  const { truckLat, truckLng, onLocationClick } = props;
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    setMapReady(true);
  }, []);

  if (!mapReady) return <div style={{ width: '100%', height: '100%', background: '#f3f4f6' }} />;

  // Lazy load the actual map component
  return <LazyMapContent truckLat={truckLat} truckLng={truckLng} onLocationClick={onLocationClick} selectedLocation={selectedLocation} setSelectedLocation={setSelectedLocation} routePath={routePath} setRoutePath={setRoutePath} />;
}

// Lazy map content
function LazyMapContent(props: any) {
  const { truckLat, truckLng, onLocationClick, selectedLocation, setSelectedLocation, routePath, setRoutePath } = props;
  const { markers: sharedMarkers } = useLocationMarkers();
  
  console.log('📍 LazyMapContent - Shared markers:', sharedMarkers);
  
  const handleMapClick = async (city: string, lat: number, lng: number) => {
    onLocationClick({ city, lat, lng });
    setSelectedLocation({ lat, lng });

    // Fetch route if truck location exists
    if (truckLat !== undefined && truckLng !== undefined) {
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${truckLng},${truckLat};${lng},${lat}?overview=full&geometries=geojson`
        );
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const coordinates = data.routes[0].geometry.coordinates;
          setRoutePath(coordinates.map(([lng, lat]: [number, number]) => [lat, lng]));
        }
      } catch (error) {
        console.error('Failed to fetch route:', error);
      }
    }
  };

  // Dynamically load React-Leaflet to avoid SSR issues
  const DynamicMap = require('next/dynamic').default(
    async () => {
      const { MapContainer, TileLayer, Marker, Polyline, useMapEvents } = await import('react-leaflet');
      const L = await import('leaflet').then(m => m.default);
      await import('leaflet/dist/leaflet.css');
      const { getNearestCity } = await import('@/lib/cities');

      const getTruckIcon = () => new L.DivIcon({
        html: `<div style="display: flex; align-items: center; justify-content: center;"><svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="12" width="12" height="14" fill="#3b82f6" stroke="#1e40af" stroke-width="2" rx="2"/><rect x="16" y="10" width="20" height="16" fill="#60a5fa" stroke="#1e40af" stroke-width="2" rx="2"/><circle cx="8" cy="28" r="3" fill="#1e40af"/><circle cx="20" cy="28" r="3" fill="#1e40af"/><circle cx="32" cy="28" r="3" fill="#1e40af"/><rect x="6" y="14" width="8" height="6" fill="#87ceeb" rx="1"/></svg></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20],
      });

      const defaultIcon = new L.Icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const getMarkerIcon = (type: 'port' | 'store' | 'plant') => {
        let color: string;
        let emoji: string;
        
        switch (type) {
          case 'port':
            color = '#ef4444';
            emoji = '⚓';
            break;
          case 'store':
            color = '#f59e0b';
            emoji = '🏪';
            break;
          case 'plant':
            color = '#8b5cf6';
            emoji = '🏭';
            break;
        }

        return new L.DivIcon({
          html: `
            <div style="background: ${color}; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
              ${emoji}
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 40],
          popupAnchor: [0, -40],
          className: 'marker-icon'
        });
      };

      const MapClickLayer = ({ onLocationClick }: any) => {
        useMapEvents({
          click(e: any) {
            const { lat, lng } = e.latlng;
            const nearestCity = getNearestCity(lat, lng);
            onLocationClick(nearestCity, lat, lng);
          },
        });
        return null;
      };

      return {
        default: function MapInner() {
          return (
            <MapContainer
              center={[12.8797, 121.7740]}
              zoom={7}
              minZoom={6}
              maxZoom={18}
              style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
              <MapClickLayer onLocationClick={handleMapClick} />
              
              {/* Display shared markers */}
              {sharedMarkers && sharedMarkers.map(marker => (
                <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={getMarkerIcon(marker.type)}>
                  {/* Popup will auto-open on click */}
                </Marker>
              ))}
              
              {truckLat !== undefined && truckLng !== undefined && (
                <Marker position={[truckLat, truckLng]} icon={getTruckIcon()} />
              )}
              {selectedLocation && (
                <Marker position={[selectedLocation.lat, selectedLocation.lng]} icon={defaultIcon} />
              )}
              {routePath.length > 0 && (
                <Polyline positions={routePath} color="#ef4444" weight={3} opacity={0.7} dashArray="5, 5" />
              )}
            </MapContainer>
          );
        }
      };
    },
    { ssr: false, loading: () => <div style={{ width: '100%', height: '100%', background: '#f3f4f6' }} /> }
  );

  return <DynamicMap />;
}
