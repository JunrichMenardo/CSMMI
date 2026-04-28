'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvent,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLocationMarkers, type LocationMarker } from '@/hooks/useLocationMarkers';
import { supabase } from '@/lib/supabase';
import { getUserRole, createManagerRequest, getManagerId } from '@/lib/managerUtils';

const getSearchMarkerIcon = () => {
  return new L.DivIcon({
    html: `
      <div style="background: #3b82f6; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
        📍
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
    className: 'marker-icon'
  });
};

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

// Helper component to handle map clicks using useMapEvent
interface MapClickHandlerProps {
  onMapClick: (lat: number, lng: number) => void;
}

const MapClickHandler: React.FC<MapClickHandlerProps> = ({ onMapClick }) => {
  useMapEvent('click', (e) => {
    const { lat, lng } = e.latlng;
    console.log('✅ MAP CLICKED AT:', { lat, lng });
    onMapClick(lat, lng);
  });

  return null;
};

export const LocationMarkerManager: React.FC = () => {
  const { markers, addMarker, removeMarker, isLoading } = useLocationMarkers();
  const [showModal, setShowModal] = useState(false);
  const [pendingMarkerLocation, setPendingMarkerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [markerNameInput, setMarkerNameInput] = useState('');
  const defaultCenter: [number, number] = [8.5, 127.5];

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setPendingMarkerLocation({ lat, lng });
  }, []);

  const saveMarkerFromModal = async () => {
    if (!pendingMarkerLocation || !markerNameInput.trim()) return;

    try {
      // Check user role
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        alert('You must be logged in');
        return;
      }

      const userRole = await getUserRole(session.user.id);

      const markerData = {
        lat: pendingMarkerLocation.lat,
        lng: pendingMarkerLocation.lng,
        name: markerNameInput.trim(),
        type: 'port' as const
      };

      // Manager: Create request instead of direct action
      if (userRole === 'manager') {
        const managerId = await getManagerId(session.user.id);
        if (!managerId) {
          alert('Manager account not found');
          return;
        }

        const created = await createManagerRequest(
          managerId,
          'add_location_marker',
          'location_marker',
          markerData
        );

        if (created) {
          alert('✅ Request submitted for admin approval!');
          // Close modal and reset
          setShowModal(false);
          setPendingMarkerLocation(null);
          setMarkerNameInput('');
        } else {
          alert('Failed to submit request');
        }
        return;
      }

      // Admin: Add marker directly
      addMarker(markerData);

      console.log('✅ MARKER SAVED AND SYNCED');

      // Close modal and reset
      setShowModal(false);
      setPendingMarkerLocation(null);
      setMarkerNameInput('');
    } catch (error) {
      console.error('Failed to save marker:', error);
      alert('Failed to save marker');
    }
  };

  const cancelAddMarker = () => {
    setShowModal(false);
    setPendingMarkerLocation(null);
    setMarkerNameInput('');
  };

  const handleDeleteMarker = async (markerId: string) => {
    try {
      // Check user role
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        alert('You must be logged in');
        return;
      }

      const userRole = await getUserRole(session.user.id);

      // Manager: Create delete request
      if (userRole === 'manager') {
        const managerId = await getManagerId(session.user.id);
        if (!managerId) {
          alert('Manager account not found');
          return;
        }

        const created = await createManagerRequest(
          managerId,
          'delete_location_marker',
          'location_marker',
          { id: markerId },
          markerId
        );

        if (created) {
          alert('✅ Delete request submitted for admin approval!\n\nThe marker will be deleted after the admin reviews and approves your request.');
        } else {
          alert('Failed to submit delete request');
        }
        return;
      }

      // Admin: Delete marker directly
      removeMarker(markerId);
    } catch (error) {
      console.error('Failed to delete marker:', error);
      alert('Failed to delete marker');
    }
  };

  return (
    <div>
      <style>{`
        @media (max-width: 768px) {
          .marker-modal {
            width: 100vw !important;
            height: 100vh !important;
            max-width: 100% !important;
            border-radius: 0 !important;
            max-height: 100vh !important;
          }
          .marker-modal-header {
            font-size: 1rem !important;
            padding: 1rem !important;
          }
          .marker-modal-footer {
            padding: 1rem !important;
          }
          .marker-modal-input {
            font-size: 1rem !important;
            padding: 0.75rem !important;
          }
          .marker-modal-button {
            padding: 0.75rem 1rem !important;
            font-size: 0.875rem !important;
            min-height: 44px;
          }
          .marker-list {
            margin-top: 1rem;
          }
          .marker-item {
            padding: 0.75rem !important;
            font-size: 0.875rem !important;
          }
          .marker-item button {
            padding: 0.5rem 0.75rem !important;
            font-size: 0.75rem !important;
          }
        }
      `}</style>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
          <h2 className="text-xl font-bold text-black">📍 Manage Location Markers</h2>
          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-2 rounded-lg font-semibold text-white transition shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 min-h-[44px]"
          >
            + Add Marker
          </button>
        </div>

        {/* Markers List */}
        {markers.length > 0 ? (
          <div className="space-y-2 marker-list">
            {markers.map((marker) => {
              const typeEmojis = { port: '⚓', store: '🏪', plant: '🏭' };
              return (
                <div
                  key={marker.id}
                  className="flex justify-between items-center bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition marker-item"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-black">
                      {typeEmojis[marker.type]} {marker.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteMarker(marker.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-100/50 font-bold px-3 py-1 rounded transition ml-2 flex-shrink-0 min-h-[44px] flex items-center justify-center"
                  >
                    ✕ Delete
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No markers added yet. Click "+ Add Marker" to get started.</p>
          </div>
        )}
      </div>

      {/* Add Marker Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-transparent z-[10001] flex items-center justify-center pointer-events-auto"
          style={{ backdropFilter: 'blur(2px)' }}
        >
          <div
            className="marker-modal bg-white/90 rounded-2xl shadow-2xl w-11/12 h-5/6 max-w-2xl flex flex-col border border-gray-200 z-[10002]"
            style={{ backdropFilter: 'blur(6px)' }}
          >
            {/* Modal Header */}
            <div className="marker-modal-header bg-gradient-to-r from-blue-500 to-blue-600 text-white p-5 rounded-t-2xl flex justify-between items-center shadow-lg">
              <h2 className="text-lg font-bold">📍 Add Location Marker (Mindanao)</h2>
              <button
                onClick={cancelAddMarker}
                className="text-white text-2xl hover:bg-white/20 p-2 rounded-full transition min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Modal Body - Map */}
            <div className="flex-1 relative cursor-crosshair bg-blue-50">
              <MapContainer
                center={defaultCenter}
                zoom={7}
                style={{ height: '100%', width: '100%' }}
                maxBounds={[[4.5, 120.0], [11.0, 131.0]]}
                maxBoundsViscosity={1.0}
                className="w-full h-full"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />

                {/* Click handler for map */}
                {showModal && <MapClickHandler onMapClick={handleMapClick} />}

                {/* Display existing markers */}
                {markers.map(marker => (
                  <Marker
                    key={marker.id}
                    position={[marker.lat, marker.lng]}
                    icon={getMarkerIcon(marker.type)}
                  >
                    <Popup>
                      <div className="text-black">
                        <p>{marker.name}</p>
                        <p className="text-xs">{marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {pendingMarkerLocation && (
                  <Marker
                    position={[pendingMarkerLocation.lat, pendingMarkerLocation.lng]}
                    icon={getSearchMarkerIcon()}
                  >
                    <Popup>
                      <div className="text-black">
                        <p>📍 Selected Location</p>
                        <p className="text-xs">{pendingMarkerLocation.lat.toFixed(4)}, {pendingMarkerLocation.lng.toFixed(4)}</p>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
              
              {/* Click instruction overlay */}
              {!pendingMarkerLocation && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="bg-black/60 text-white px-6 py-3 rounded-lg backdrop-blur-sm font-semibold text-center">
                    👇 Click anywhere on the map to place marker
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer - Input & Actions */}
            <div
              className="marker-modal-footer border-t border-white/20 p-5 rounded-b-2xl"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(10px)' }}
            >
              {pendingMarkerLocation ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-600 bg-green-50/50 p-3 rounded-lg text-sm font-semibold">
                    <span>✅ Location selected:</span>
                    <span>{pendingMarkerLocation.lat.toFixed(4)}, {pendingMarkerLocation.lng.toFixed(4)}</span>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">📝 Location Name:</label>
                    <input
                      type="text"
                      value={markerNameInput}
                      onChange={(e) => setMarkerNameInput(e.target.value)}
                      placeholder="e.g., Port of Davao, My Warehouse, etc."
                      className="marker-modal-input w-full px-4 py-3 border-2 border-blue-200 rounded-xl text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white/80"
                      autoFocus
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && markerNameInput.trim()) {
                          saveMarkerFromModal();
                        }
                      }}
                    />
                  </div>
                  <div className="flex gap-3 justify-end flex-wrap">
                    <button
                      onClick={() => setPendingMarkerLocation(null)}
                      className="marker-modal-button px-5 py-2 bg-gray-400/70 hover:bg-gray-500/80 text-white rounded-lg font-semibold transition shadow-md backdrop-blur-sm"
                    >
                      ← Choose Different Location
                    </button>
                    <button
                      onClick={saveMarkerFromModal}
                      disabled={!markerNameInput.trim()}
                      className="marker-modal-button px-5 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-semibold transition shadow-md disabled:shadow-none"
                    >
                      ✓ Save Marker
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-600 text-sm font-medium">👆 Map is ready - click anywhere to place a marker</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
