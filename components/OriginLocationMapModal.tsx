'use client';

import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useLocationMarkers } from '@/hooks/useLocationMarkers';

interface OriginLocationMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (location: string) => void;
  currentLocation?: string;
}

export const OriginLocationMapModal: React.FC<OriginLocationMapModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  currentLocation,
}) => {
  const [selectedCity, setSelectedCity] = useState<string | null>(currentLocation || null);
  const [isMounted, setIsMounted] = useState(false);
  const { markers } = useLocationMarkers();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleConfirm = () => {
    if (selectedCity) {
      onSelectLocation(selectedCity);
      setSelectedCity(null);
      onClose();
    }
  };

  const handleLocationClick = (data: { city: string; lat: number; lng: number }) => {
    const locationString = `${data.city}|${data.lat}|${data.lng}`;
    setSelectedCity(locationString);
  };

  if (!isOpen || !isMounted) return null;

  const MapComponent = dynamic(
    () => import('./OriginLocationMapContent').then(m => ({ default: m.default })),
    { ssr: false, loading: () => <div style={{ width: '100%', height: '100%', background: '#f3f4f6' }} /> }
  );

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .origin-modal-container {
            width: 100vw !important;
            height: 100vh !important;
            border-radius: 0 !important;
            max-width: 100% !important;
          }
          .origin-modal-header {
            padding: 1rem !important;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem !important;
          }
          .origin-modal-header h2 {
            font-size: 1rem !important;
          }
          .origin-modal-header button {
            position: absolute;
            right: 1rem;
            top: 1rem;
          }
          .origin-modal-quickselect {
            max-height: 100px !important;
            padding: 0.75rem !important;
          }
          .origin-modal-quickselect p {
            font-size: 0.75rem !important;
          }
          .origin-modal-button {
            padding: 0.5rem 0.5rem !important;
            font-size: 0.75rem !important;
            min-height: 44px;
            min-width: 44px;
          }
          .origin-modal-footer {
            padding: 1rem !important;
          }
          .origin-modal-footer button {
            padding: 0.75rem 1rem !important;
            font-size: 0.875rem !important;
            min-height: 44px;
          }
        }
      `}</style>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }} />
      
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div onClick={(e) => e.stopPropagation()} className="origin-modal-container" style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 20px 25px rgba(0,0,0,0.1)', width: '95vw', height: '90vh', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* Header */}
          <div className="origin-modal-header" style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin style={{ color: '#2563eb' }} size={24} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#000' }}>Select Origin Location</h2>
            </div>
            <button onClick={onClose} style={{ color: '#9ca3af', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
          </div>

          {/* Map Container - takes all remaining space */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', width: '100%', minHeight: 0 }}>
            <MapComponent onLocationClick={handleLocationClick} />
            {!selectedCity && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}>
                <div style={{ background: '#2563eb', color: 'white', padding: '1rem 1.5rem', borderRadius: '0.5rem', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', textAlign: 'center' }}>
                  <p style={{ fontWeight: '600', margin: '0 0 0.25rem 0' }}>Click on map to select origin location</p>
                  <p style={{ fontSize: '0.875rem', margin: 0, opacity: 0.9 }}>Scroll to zoom • Drag to pan</p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Select Locations Section */}
          {markers.length > 0 && (
            <div className="origin-modal-quickselect" style={{ padding: '0.75rem', borderTop: '1px solid #e5e7eb', background: '#f0f9ff', flexShrink: 0, overflow: 'auto', maxHeight: '100px' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#000', margin: '0 0 0.75rem 0' }}>Quick Select Locations:</p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {markers.map((marker) => {
                  const typeEmojis = { port: '⚓', store: '🏪', plant: '🏭' };
                  const markerString = `${marker.name}|${marker.lat}|${marker.lng}`;
                  const isSelected = selectedCity === markerString;
                  return (
                    <button
                      key={marker.id}
                      className="origin-modal-button"
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
          <div className="origin-modal-footer" style={{ padding: '1.5rem', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
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
