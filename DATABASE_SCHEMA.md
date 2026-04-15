# Supabase Database Schema

This document outlines the database schema for the Container Stock Monitoring system.

## Tables

### 1. trucks
Stores information about trucks in the fleet.

```sql
CREATE TABLE trucks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_name VARCHAR(255) NOT NULL,
  plate_number VARCHAR(50) UNIQUE NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  status VARCHAR(50) DEFAULT 'Idle' CHECK (status IN ('Idle', 'Delivering', 'Returning')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. containers
Stores container information and their assignment to trucks.

```sql
CREATE TABLE containers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id VARCHAR(100) UNIQUE NOT NULL,
  truck_id UUID REFERENCES trucks(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'Loaded' CHECK (status IN ('Loaded', 'In Transit', 'Delivered')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. stocks
Stores items inside containers.

```sql
CREATE TABLE stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id UUID REFERENCES containers(id) ON DELETE CASCADE NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. truck_routes
Stores GPS coordinates over time for route tracking.

```sql
CREATE TABLE truck_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id UUID REFERENCES trucks(id) ON DELETE CASCADE NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Setup Instructions

1. Create a new Supabase project at https://supabase.com
2. Get your Project URL and ANON KEY
3. Add them to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
   ```
4. In Supabase, go to the SQL Editor
5. Run each CREATE TABLE statement above
6. Configure Row Level Security (RLS) policies as needed

## Indexes (Recommended)

```sql
CREATE INDEX idx_containers_truck_id ON containers(truck_id);
CREATE INDEX idx_stocks_container_id ON stocks(container_id);
CREATE INDEX idx_truck_routes_truck_id ON truck_routes(truck_id);
CREATE INDEX idx_truck_routes_timestamp ON truck_routes(timestamp);
```

## Realtime Configuration

Enable realtime for required tables in Supabase:
1. Go to Realtime in Supabase dashboard
2. Enable for: `trucks`, `containers`, `stocks`, `truck_routes`
