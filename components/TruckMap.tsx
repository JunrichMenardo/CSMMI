'use client';

import { useEffect, useState, memo, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Truck, TruckRoute } from '@/types';
import { fetchTruckRoutes } from '@/lib/api';
import { getCityCoordinates } from '@/lib/cities';
import { useLocationMarkers } from '@/hooks/useLocationMarkers';

// Philippines Locations Database - Accurate Coordinates
const PHILIPPINES_LOCATIONS = [
  // Mindanao Ports - ACCURATE COORDINATES
  { name: 'Port of Zamboanga', lat: 6.9082, lng: 122.0788 },
  { name: 'Port of Dipolog', lat: 8.6329, lng: 123.3385 },
  { name: 'Port of Cagayan de Oro', lat: 8.4841, lng: 124.6332 },
  { name: 'Port of Iligan', lat: 8.2256, lng: 124.2168 },
  { name: 'Port of Butuan', lat: 8.9699, lng: 125.5255 },
  { name: 'Port of Surigao', lat: 9.7644, lng: 125.5044 },
  { name: 'Port of Davao', lat: 7.0731, lng: 125.6123 },
  { name: 'Port of General Santos', lat: 6.1304, lng: 125.1713 },
  { name: 'Port of Cotabato', lat: 7.2047, lng: 124.2427 },
  { name: 'Port of Nasipit', lat: 9.1050, lng: 125.4833 },
  
  // Major Cities in Mindanao - ACCURATE COORDINATES
  { name: 'Davao City', lat: 7.0731, lng: 125.6123 },
  { name: 'Cagayan de Oro', lat: 8.4841, lng: 124.6332 },
  { name: 'Zamboanga City', lat: 6.9082, lng: 122.0788 },
  { name: 'Iligan City', lat: 8.2256, lng: 124.2168 },
  { name: 'Butuan City', lat: 8.9699, lng: 125.5255 },
  { name: 'General Santos City', lat: 6.1304, lng: 125.1713 },
  { name: 'Cotabato City', lat: 7.2047, lng: 124.2427 },
  { name: 'Surigao City', lat: 9.7644, lng: 125.5044 },
  
  // Major Cities in Luzon - ACCURATE COORDINATES
  { name: 'Manila', lat: 14.5994, lng: 120.9842 },
  { name: 'Port of Manila', lat: 14.5994, lng: 120.9842 },
  { name: 'Quezon City', lat: 14.6349, lng: 121.0388 },
  { name: 'Makati', lat: 14.5505, lng: 121.0233 },
  { name: 'Caloocan', lat: 14.6288, lng: 120.9757 },
  
  // Major Cities in Visayas - ACCURATE COORDINATES
  { name: 'Cebu City', lat: 10.3157, lng: 123.8854 },
  { name: 'Port of Cebu', lat: 10.3157, lng: 123.8854 },
  { name: 'Iloilo City', lat: 10.6894, lng: 122.5598 },
  { name: 'Bacolod City', lat: 10.4017, lng: 122.9852 },
];

// Function to fetch road route from OSRM API
const fetchRoadRoute = async (
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<[number, number][]> => {
  try {
    // Try calling public OSRM directly from the client (Leaflet-style client routing)
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const resp = await fetch(osrmUrl, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (resp.ok) {
      const payload = await resp.json();
      const osrmCoords = payload?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined;
      if (Array.isArray(osrmCoords) && osrmCoords.length > 1) {
        // convert [lng,lat] -> [lat,lng]
        return osrmCoords.map(([lng, lat]) => [lat, lng] as [number, number]);
      }
    }
  } catch (err) {
    // ignore and fall through to client fallback
  }

  // Final client-side fallback: interpolate a visible straight line
  const steps = 20;
  const out: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat = startLat + (endLat - startLat) * t;
    const lng = startLng + (endLng - startLng) * t;
    out.push([lat, lng]);
  }
  return out;
};

const getTruckIcon = (rotation: number = 0) => {
  return new L.DivIcon({
    html: `
      <div style="transform: rotate(${rotation}deg); transform-origin: center center;">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Truck cab -->
          <rect x="4" y="12" width="12" height="14" fill="#3b82f6" stroke="#1e40af" stroke-width="2" rx="2"/>
          <!-- Truck bed -->
          <rect x="16" y="10" width="20" height="16" fill="#60a5fa" stroke="#1e40af" stroke-width="2" rx="2"/>
          <!-- Wheels -->
          <circle cx="8" cy="28" r="3" fill="#1e40af"/>
          <circle cx="20" cy="28" r="3" fill="#1e40af"/>
          <circle cx="32" cy="28" r="3" fill="#1e40af"/>
          <!-- Window -->
          <rect x="6" y="14" width="8" height="6" fill="#87ceeb" rx="1"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
    className: 'truck-icon'
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


// Mindanao Seaports Data
const MINDANAO_SEAPORTS = [
  { name: 'Port of Zamboanga', lat: 6.9083, lng: 122.0789 },
  { name: 'Port of Dipolog', lat: 8.6329, lng: 123.3385 },
  { name: 'Port of Dapitan', lat: 8.5670, lng: 123.6485 },
  { name: 'Port of Ozamiz', lat: 8.1465, lng: 123.8479 },
  { name: 'Port of Oroquieta', lat: 8.5933, lng: 123.8129 },
  { name: 'Port of Jimenez', lat: 8.5050, lng: 123.8150 },
  { name: 'Port of Plaridel', lat: 8.7467, lng: 123.7842 },
  { name: 'Port of Cagayan de Oro', lat: 8.4842, lng: 124.6331 },
  { name: 'Port of Opol', lat: 8.5833, lng: 124.5500 },
  { name: 'Port of Iligan', lat: 8.2256, lng: 124.2168 },
  { name: 'Port of Mukas', lat: 8.3667, lng: 124.1333 },
  { name: 'Port of Tubod', lat: 8.3833, lng: 124.3000 },
  { name: 'Port of Butuan', lat: 8.9699, lng: 125.5255 },
  { name: 'Port of Nasipit', lat: 9.1050, lng: 125.4833 },
  { name: 'Port of Bislig', lat: 8.1963, lng: 126.1375 },
  { name: 'Port of Surigao', lat: 9.7644, lng: 125.5044 },
  { name: 'Port of Mati', lat: 7.5929, lng: 126.2037 },
  { name: 'Port of Davao', lat: 7.0731, lng: 125.6123 },
  { name: 'Port of Pagadian', lat: 7.8175, lng: 123.4304 },
  { name: 'Port of General Santos', lat: 6.1304, lng: 125.1713 },
  { name: 'Port of Cotabato', lat: 7.2047, lng: 124.2427 },
  { name: 'Port of Balingoan', lat: 8.7667, lng: 124.4000 },
];

// Fix for default Leaflet marker icon
const defaultIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Seaport Icon with Red Marker
const getSeaportIcon = () => {
  return new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
};

interface MapProps {
  trucks: Truck[];
  selectedTruckId: string | null;
  onSelectTruck: (truckId: string) => void;
  onMarkersChange?: (markers: Array<{ id: string; lat: number; lng: number; name: string; type: 'port' | 'store' | 'plant' }>) => void;
}

const TruckMarkers: React.FC<{
  trucks: Truck[];
  selectedTruckId: string | null;
  onSelectTruck: (truckId: string) => void;
  routes: { [key: string]: TruckRoute[] };
  destinations: { [key: string]: { lat: number; lng: number; name: string } | null };
  roadRoutes: { [key: string]: [number, number][] };
}> = memo(({ trucks, selectedTruckId, onSelectTruck, routes, destinations, roadRoutes }) => {
  return (
    <>

      {trucks.map((truck) => {
        return (
        <div key={truck.id}>
          {truck.latitude && truck.longitude && (
            <>
              {/* Draw travel path polyline for selected truck */}
              {selectedTruckId === truck.id && routes[truck.id]?.length > 0 && (
                <>
                  {/* Solid path line showing traveled route */}
                  <Polyline
                    positions={[
                      [truck.latitude, truck.longitude] as [number, number],
                      ...routes[truck.id].map((r) => [r.waypoint_lat, r.waypoint_lng] as [number, number]),
                    ]}
                    color="#3b82f6"
                    weight={3}
                    opacity={0.8}
                  />
                  {/* Waypoint markers */}
                  {routes[truck.id].map((route, idx) => (
                    <Marker
                      key={`${truck.id}-route-${idx}`}
                      position={[route.waypoint_lat, route.waypoint_lng]}
                      icon={new L.Icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41],
                      })}
                    >
                      <Popup>
                        <div className="text-xs">
                          <p>Waypoint {idx + 1}</p>
                          <p>{route.waypoint_lat.toFixed(4)}, {route.waypoint_lng.toFixed(4)}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </>
              )}

              {/* Destination path trace line - follows roads */}
              {selectedTruckId === truck.id && destinations[truck.id] && (
                <>
                  {/* Road trace polyline */}
                  {roadRoutes[truck.id] && roadRoutes[truck.id].length > 1 && (
                    <Polyline
                      positions={roadRoutes[truck.id]}
                      color={roadRoutes[truck.id].length > 2 ? '#ef4444' : '#f97316'}
                      weight={3}
                      opacity={0.75}
                      dashArray="5, 5"
                    />
                  )}

                  {/* Destination marker */}
                  <Marker
                    position={[destinations[truck.id]!.lat, destinations[truck.id]!.lng]}
                    icon={new L.Icon({
                      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                      iconSize: [25, 41],
                      iconAnchor: [12, 41],
                      popupAnchor: [1, -34],
                      shadowSize: [41, 41],
                    })}
                  >
                    <Popup>
                      <div className="p-2">
                        <p className="font-bold text-red-600">Destination</p>
                        <p className="text-sm">{destinations[truck.id]!.name}</p>
                        <p className="text-xs">
                          {destinations[truck.id]!.lat.toFixed(4)}, {destinations[truck.id]!.lng.toFixed(4)}
                        </p>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Destination radius circle */}
                  <Circle
                    center={[destinations[truck.id]!.lat, destinations[truck.id]!.lng]}
                    radius={500}
                    fillColor="#ef4444"
                    fillOpacity={0.1}
                    color="#ef4444"
                    weight={1}
                  />
                </>
              )}

              {/* Truck marker */}
              <Marker
                position={[truck.latitude, truck.longitude]}
                icon={getTruckIcon()}
                eventHandlers={{
                  click: () => onSelectTruck(truck.id),
                }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold">{truck.name}</h3>
                    <p className="text-sm">Driver: {truck.driver_name}</p>
                    <p className="text-sm">Status: {truck.status}</p>
                    <p className="text-sm">
                      Location: {truck.latitude?.toFixed(4)}, {truck.longitude?.toFixed(4)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            </>
          )}
        </div>
        );
      })}
    </>
  );
});

TruckMarkers.displayName = 'TruckMarkers';

const TruckMapComponent: React.FC<MapProps> = ({
  trucks,
  selectedTruckId,
  onSelectTruck,
  onMarkersChange,
}) => {
  const { markers: customMarkers } = useLocationMarkers();
  const [routes, setRoutes] = useState<{ [key: string]: TruckRoute[] }>({});
  const [destinations, setDestinations] = useState<{ [key: string]: { lat: number; lng: number; name: string } | null }>({});
  const [roadRoutes, setRoadRoutes] = useState<{ [key: string]: [number, number][] }>({});
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [searchMarker, setSearchMarker] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ name: string; lat: number; lng: number }>>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const mapRef = useRef<any>(null);
  const lastRouteKeyRef = useRef<string>('');
  const failedRouteUntilRef = useRef<Record<string, number>>({});
  const lastRouteFetchAtRef = useRef<Record<string, number>>({});

  const selectedTruck = trucks.find((t) => t.id === selectedTruckId);

  // Notify parent when markers change
  useEffect(() => {
    onMarkersChange?.(customMarkers);
  }, [customMarkers, onMarkersChange]);

  // Fetch routes and destination when truck is selected
  useEffect(() => {
    if (selectedTruckId) {
      setLoadingRoutes(true);
      
      // Fetch truck routes (waypoints)
      fetchTruckRoutes(selectedTruckId)
        .then((data) => {
          setRoutes((prev) => ({ ...prev, [selectedTruckId]: data }));
        })
        .catch((err) => {
          console.debug('No routes found for truck:', err);
          setRoutes((prev) => ({ ...prev, [selectedTruckId]: [] }));
        });

      // Get destination from truck's destination_location - ONLY TRUCK DESTINATION
      const truck = trucks.find((t) => t.id === selectedTruckId);
      if (truck && truck.destination_location && truck.destination_location.trim() !== '') {
        let destLat: number, destLng: number, destName: string;
        
        // Parse destination format: "city|lat|lng" or just "city"
        if (truck.destination_location.includes('|')) {
          const parts = truck.destination_location.split('|');
          destName = parts[0];
          destLat = parseFloat(parts[1]);
          destLng = parseFloat(parts[2]);
        } else {
          // Fallback for old format (just city name)
          const coords = getCityCoordinates(truck.destination_location);
          destName = truck.destination_location;
          destLat = coords.lat;
          destLng = coords.lng;
        }

        setDestinations((prev) => ({
          ...prev,
          [selectedTruckId]: {
            lat: destLat,
            lng: destLng,
            name: destName,
          },
        }));

        // Fetch road route from truck to destination
        if (truck.latitude && truck.longitude) {
          const routeKey = `${selectedTruckId}:${truck.latitude.toFixed(2)},${truck.longitude.toFixed(2)}:${destLat.toFixed(2)},${destLng.toFixed(2)}`;
          const now = Date.now();
          const cooldownUntil = failedRouteUntilRef.current[routeKey] ?? 0;
          const lastFetchedAt = lastRouteFetchAtRef.current[routeKey] ?? 0;

          // Global throttle per route key: avoid hammering provider while trucks poll/update.
          if (now - lastFetchedAt < 30000) {
            setLoadingRoutes(false);
            return;
          }

          if (cooldownUntil > now) {
            setLoadingRoutes(false);
            return;
          }
          if (lastRouteKeyRef.current === routeKey) {
            setLoadingRoutes(false);
            return;
          }
          lastRouteKeyRef.current = routeKey;
          lastRouteFetchAtRef.current[routeKey] = now;

          fetchRoadRoute(truck.latitude, truck.longitude, destLat, destLng)
            .then((roadCoordinates) => {
              if (roadCoordinates.length <= 2) {
                failedRouteUntilRef.current[routeKey] = Date.now() + 120000;
              } else {
                delete failedRouteUntilRef.current[routeKey];
              }
              setRoadRoutes((prev) => ({ ...prev, [selectedTruckId]: roadCoordinates }));
            })
            .catch(() => {
              failedRouteUntilRef.current[routeKey] = Date.now() + 120000;
              setRoadRoutes((prev) => ({ ...prev, [selectedTruckId]: [] }));
            });
        }
      } else {
        setDestinations((prev) => ({ ...prev, [selectedTruckId]: null }));
        setRoadRoutes((prev) => ({ ...prev, [selectedTruckId]: [] }));
        lastRouteKeyRef.current = '';
      }
      
      setLoadingRoutes(false);
    }
  }, [selectedTruckId, trucks]);

  const defaultCenter: [number, number] = [8.5, 127.5]; // Mindanao center



  const searchPlaces = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      // First, search in Philippines database
      const lowerQuery = query.toLowerCase();
      const localResults = PHILIPPINES_LOCATIONS.filter(loc =>
        loc.name.toLowerCase().includes(lowerQuery)
      );

      if (localResults.length > 0) {
        setSearchResults(localResults);
        setShowSearchResults(true);
        setSearching(false);
        return;
      }

      // If no results in local database, search with Nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=10`
      );
      const data = await response.json();
      
      const results = data.map((item: any) => ({
        name: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }));
      
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchSelect = (result: { name: string; lat: number; lng: number }) => {
    console.log('🔍 SEARCH RESULT SELECTED:', result);
    
    // Center map on location
    if (mapRef.current) {
      mapRef.current.setView([result.lat, result.lng], 12);
    }

    // Show temporary marker (NOT permanent)
    setSearchMarker({
      lat: result.lat,
      lng: result.lng,
      name: result.name
    });

    // Keep search visible so user can clear it
    setShowSearchResults(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setSearchMarker(null); // Remove temporary marker
  };

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl relative z-0 bg-gradient-to-br from-blue-50 to-cyan-50 border border-white/20">
      <MapContainer
        center={defaultCenter}
        zoom={7}
        style={{ height: '100%', width: '100%' }}
        maxBounds={[[4.5, 120.0], [11.0, 131.0]]} // Mindanao bounds
        maxBoundsViscosity={1.0}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        
        {/* Truck Markers and Routes */}
        <TruckMarkers
          trucks={trucks}
          selectedTruckId={selectedTruckId}
          onSelectTruck={onSelectTruck}
          routes={routes}
          destinations={destinations}
          roadRoutes={roadRoutes}
        />

        {/* Custom Location Markers */}
        {customMarkers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={getMarkerIcon(marker.type)}
          >
            <Popup>
              <div className="p-2">
                <p className="font-bold text-black">{marker.name}</p>
                <p className="text-xs text-gray-600 capitalize">Type: {marker.type}</p>
                <p className="text-xs">{marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Temporary Search Result Marker */}
        {searchMarker && (
          <Marker
            position={[searchMarker.lat, searchMarker.lng]}
            icon={getSearchMarkerIcon()}
          >
            <Popup>
              <div className="p-2">
                <p className="font-bold text-black">{searchMarker.name}</p>
                <p className="text-xs">{searchMarker.lat.toFixed(4)}, {searchMarker.lng.toFixed(4)}</p>
                <p className="text-xs text-gray-500 mt-1">📍 Location Preview</p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Add Marker Button - Always Visible */}


      {loadingRoutes && (
        <div className="absolute top-4 left-4 bg-white p-3 rounded shadow">
          <p className="text-sm text-black">Loading route...</p>
        </div>
      )}


    </div>
  );
};

export const TruckMap = memo(TruckMapComponent);

export default TruckMap;
