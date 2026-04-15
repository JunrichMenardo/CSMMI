'use client';

import { useEffect, useState, memo } from 'react';
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

// Function to fetch road route from OSRM API
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
      // Convert [lng, lat] to [lat, lng] format for Leaflet
      return coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
    }
  } catch (error) {
    console.error('Failed to fetch road route:', error);
  }
  return [];
};

// Truck SVG Icon
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

// Fix for default Leaflet marker icon
const defaultIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapProps {
  trucks: Truck[];
  selectedTruckId: string | null;
  onSelectTruck: (truckId: string) => void;
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
      {trucks.map((truck) => (
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
                  {roadRoutes[truck.id] && roadRoutes[truck.id].length > 0 ? (
                    <Polyline
                      positions={roadRoutes[truck.id]}
                      color="#ef4444"
                      weight={3}
                      opacity={0.7}
                      dashArray="5, 5"
                    />
                  ) : (
                    // Fallback to straight line if no road route
                    <Polyline
                      positions={[
                        [truck.latitude, truck.longitude] as [number, number],
                        [destinations[truck.id]!.lat, destinations[truck.id]!.lng] as [number, number],
                      ]}
                      color="#ef4444"
                      weight={2}
                      opacity={0.6}
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
      ))}
    </>
  );
});

TruckMarkers.displayName = 'TruckMarkers';

const TruckMapComponent: React.FC<MapProps> = ({
  trucks,
  selectedTruckId,
  onSelectTruck,
}) => {
  const [routes, setRoutes] = useState<{ [key: string]: TruckRoute[] }>({});
  const [destinations, setDestinations] = useState<{ [key: string]: { lat: number; lng: number; name: string } | null }>({});
  const [roadRoutes, setRoadRoutes] = useState<{ [key: string]: [number, number][] }>({});
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  const selectedTruck = trucks.find((t) => t.id === selectedTruckId);

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
      console.log('=== TRUCK SELECTION ===');
      console.log('Truck Name:', truck?.name);
      console.log('Truck ID:', truck?.id);
      console.log('Truck Location:', truck?.latitude, truck?.longitude);
      console.log('Truck Destination Location (from DB):', truck?.destination_location);
      
      if (truck && truck.destination_location && truck.destination_location.trim() !== '') {
        let destLat: number, destLng: number, destName: string;
        
        // Parse destination format: "city|lat|lng" or just "city"
        if (truck.destination_location.includes('|')) {
          const parts = truck.destination_location.split('|');
          destName = parts[0];
          destLat = parseFloat(parts[1]);
          destLng = parseFloat(parts[2]);
          console.log('Parsed destination with coordinates:', { destName, destLat, destLng });
        } else {
          // Fallback for old format (just city name)
          const coords = getCityCoordinates(truck.destination_location);
          destName = truck.destination_location;
          destLat = coords.lat;
          destLng = coords.lng;
          console.log('Using predefined city coordinates for:', destName);
        }
        
        console.log('Resolved Destination City:', destName);
        console.log('Destination Coordinates:', { lat: destLat, lng: destLng });
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
          console.log('Fetching road route from', [truck.latitude, truck.longitude], 'to', [destLat, destLng]);
          fetchRoadRoute(truck.latitude, truck.longitude, destLat, destLng)
            .then((roadCoordinates) => {
              console.log('Road route fetched with', roadCoordinates.length, 'waypoints');
              setRoadRoutes((prev) => ({ ...prev, [selectedTruckId]: roadCoordinates }));
            })
            .catch((err) => {
              console.debug('Failed to fetch road route:', err);
              setRoadRoutes((prev) => ({ ...prev, [selectedTruckId]: [] }));
            });
        }
      } else {
        console.log('No destination set for this truck - showing no destination marker');
        setDestinations((prev) => ({ ...prev, [selectedTruckId]: null }));
        setRoadRoutes((prev) => ({ ...prev, [selectedTruckId]: [] }));
      }
      
      setLoadingRoutes(false);
    }
  }, [selectedTruckId, trucks]);

  const defaultCenter: [number, number] = [12.8797, 121.7740]; // Philippines center

  return (
    <div className="w-full h-full rounded-lg overflow-hidden shadow-lg">
      <MapContainer
        center={defaultCenter}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <TruckMarkers
          trucks={trucks}
          selectedTruckId={selectedTruckId}
          onSelectTruck={onSelectTruck}
          routes={routes}
          destinations={destinations}
          roadRoutes={roadRoutes}
        />
      </MapContainer>
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
