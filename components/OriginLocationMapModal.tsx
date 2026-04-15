'use client';

import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import dynamic from 'next/dynamic';

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
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }} />
      
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 20px 25px rgba(0,0,0,0.1)', width: '95vw', height: '90vh', display: 'flex', flexDirection: 'column' }}>
          
          {/* Header */}
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin style={{ color: '#2563eb' }} size={24} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#000' }}>Select Origin Location</h2>
            </div>
            <button onClick={onClose} style={{ color: '#9ca3af', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
          </div>

          {/* Map Container */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', width: '100%' }}>
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

          {/* Footer */}
          <div style={{ padding: '1.5rem', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
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
