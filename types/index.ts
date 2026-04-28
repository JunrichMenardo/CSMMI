// Database Types
export interface Truck {
  id: string;
  name: string;
  driver_name: string | null;
  status: 'Active' | 'Idle' | 'Maintenance';
  latitude: number;
  longitude: number;
  capacity: number;
  current_load: number | null;
  route_id: string | null;
  destination_location: string | null;
  created_at: string;
  updated_at: string;
}

export interface Container {
  id: string;
  container_number: string;
  truck_id: string | null;
  status: 'Available' | 'In Transit' | 'Stored' | 'Delivered';
  origin_location: string | null;
  destination_location: string | null;
  created_at: string;
  updated_at: string;
}

export interface Stock {
  id: string;
  container_id: string | null;
  item_name: string;
  quantity: number;
  unit: string;
  price_per_unit?: number | null;
  description?: string | null;
  weight?: number;
  expiry_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TruckRoute {
  id: string;
  truck_id: string;
  waypoint_lat: number;
  waypoint_lng: number;
  waypoint_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'staff';
  created_at: string;
}

// UI State Types
export interface MapState {
  trucks: Truck[];
  selectedTruckId: string | null;
  routes: { [key: string]: TruckRoute[] };
  loading: boolean;
  error: string | null;
}

export interface ContainerDetails extends Container {
  trucks?: Truck;
  stocks?: Stock[];
}
