# Container Stock Monitoring System

A comprehensive full-stack web application for real-time truck tracking and container stock monitoring. Built with Next.js, Supabase, and Leaflet.js.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (create free at https://supabase.com)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables** (`.env.local`)
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **Create Supabase database** (see [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md))

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Open http://localhost:3000
   - Create an account or login

## 📁 Project Structure

```
├── app/
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main dashboard
│   │   └── containers/    # Container management
│   ├── api/              # API routes (if needed)
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page (redirects to dashboard/auth)
│   └── globals.css       # Global styles
│
├── components/           # Reusable React components
│   ├── Header.tsx        # App header with logout
│   ├── TruckMap.tsx      # Leaflet map with real-time tracking
│   ├── TruckList.tsx     # List of trucks
│   ├── TruckDetails.tsx  # Truck details panel
│   ├── StockMonitoring.tsx # Stock table view
│   ├── DashboardStats.tsx  # Stats cards
│   └── index.ts          # Component exports
│
├── lib/
│   ├── supabase.ts       # Supabase client & realtime subscriptions
│   ├── api.ts            # Data fetching functions
│   └── store.ts          # Zustand state management
│
├── types/
│   └── index.ts          # TypeScript type definitions
│
├── public/               # Static assets
│
├── .env.local            # Environment variables (git-ignored)
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── tailwind.config.ts    # Tailwind CSS config
├── next.config.ts        # Next.js config
│
└── DATABASE_SCHEMA.md    # Database setup guide
```

## 🎯 Core Features

### 1. Authentication
- Email/Password login with Supabase Auth
- Role-based access (Admin, Staff)
- Secure session management

### 2. Real-Time Truck Tracking
- Live map display using Leaflet.js
- Real-time GPS location updates via Supabase Realtime
- Truck status tracking (Idle, Delivering, Returning)
- Interactive truck markers with details popup

### 3. Route History
- GPS coordinates stored over time
- Route visualization using polylines
- Historical path display for selected truck
- Timestamp tracking for each position

### 4. Container Management
- Assign containers to trucks
- Track container status (Loaded, In Transit, Delivered)
- View containers assigned to each truck
- Real-time updates

### 5. Stock Monitoring
- Monitor items inside containers
- Track quantities and units
- Real-time stock inventory
- Search and filter capabilities

### 6. Dashboard
- Active trucks count
- Containers in transit count
- Total stock items count
- Quick stats overview

## 🗄️ Database Schema

### Tables

**trucks** - Fleet information
```
- id: UUID (PK)
- driver_name: VARCHAR
- plate_number: VARCHAR (UNIQUE)
- latitude: DECIMAL
- longitude: DECIMAL
- status: VARCHAR (Idle|Delivering|Returning)
- updated_at: TIMESTAMP
```

**containers** - Container information
```
- id: UUID (PK)
- container_id: VARCHAR (UNIQUE)
- truck_id: UUID (FK → trucks)
- status: VARCHAR (Loaded|In Transit|Delivered)
- updated_at: TIMESTAMP
```

**stocks** - Items inside containers
```
- id: UUID (PK)
- container_id: UUID (FK → containers)
- item_name: VARCHAR
- quantity: DECIMAL
- unit: VARCHAR (kg, boxes, etc.)
- updated_at: TIMESTAMP
```

**truck_routes** - GPS history
```
- id: UUID (PK)
- truck_id: UUID (FK → trucks)
- latitude: DECIMAL
- longitude: DECIMAL
- timestamp: TIMESTAMP
```

### Setup Instructions

1. Create a new Supabase project: https://supabase.com
2. Get your Project URL and ANON KEY
3. Navigate to SQL Editor in Supabase
4. Run the SQL statements from [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
5. Enable Realtime for all tables: Go to Realtime → Select tables to subscribe

## 🗺️ Map Integration

The application uses:
- **Leaflet.js**: Open-source mapping library
- **React-Leaflet**: React bindings for Leaflet
- **OpenStreetMap**: Free tile provider

### Features
- Interactive map with zoom and pan
- Auto-center on selected truck
- Polyline route visualization
- Marker popups with truck information

## 🔄 Real-Time Updates

The system uses Supabase Realtime to push live updates for:
- Truck location changes
- New route points
- Container status updates
- Stock modifications

Subscriptions are managed in:
- `lib/supabase.ts` - Connection setup
- `lib/api.ts` - Data operations
- `app/dashboard/page.tsx` - Dashboard subscriptions

## 🌐 Environment Variables

Create `.env.local`:
```env
# Supabase Configuration (Public, safe to expose)
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]

# Application Settings (Optional)
NEXT_PUBLIC_APP_NAME=Container Stock Monitoring
```

## 📦 Installation & Deployment

### Local Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm run start
```

### Deploy to Vercel
```bash
vercel
```

(Vercel auto-imports `.env.local` variables)

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16.2, React 19.2, TypeScript 5 |
| Styling | Tailwind CSS 4, Lucide React Icons |
| State | Zustand 4.4 |
| Backend | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Real-time | Supabase Realtime |
| Maps | Leaflet 1.9, React-Leaflet 4.2 |
| Utils | date-fns 3.0 |

## 📋 Sample Data

To test the application, add sample data in Supabase SQL Editor:

```sql
-- Add sample truck
INSERT INTO trucks (driver_name, plate_number, latitude, longitude, status)
VALUES ('John Doe', 'ABC-123', 28.7041, 77.1025, 'Delivering');

-- Add sample container
INSERT INTO containers (container_id, truck_id, status)
VALUES ('CNT-001', [truck_id], 'In Transit');

-- Add sample stock
INSERT INTO stocks (container_id, item_name, quantity, unit)
VALUES ([container_id], 'Ceramic Tiles', 500, 'boxes');
```

## 🚀 Usage

### As an Admin
1. Login with your credentials
2. View the real-time map with truck positions
3. Click trucks to see details and routes
4. View container assignments
5. Monitor stock levels

### Adding a Truck (via Supabase)
```sql
INSERT INTO trucks (driver_name, plate_number, latitude, longitude, status)
VALUES ('Jane Smith', 'XYZ-789', 28.6139, 77.2090, 'Idle');
```

### Updating Truck Location
```sql
UPDATE trucks 
SET latitude = 28.7200, longitude = 77.1150, updated_at = NOW()
WHERE id = [truck_id];
```

### Simulating GPS Movement
The system will automatically fetch and display route history. New GPS points are captured in the `truck_routes` table with timestamps.

## 🔐 Security Best Practices

1. **Never commit `.env.local`** - It's in `.gitignore`
2. **Enable Row Level Security (RLS)** in Supabase for production
3. **Validate inputs** on both client and server
4. **Use HTTPS** for production deployments
5. **Regular backups** of Supabase database

## 📚 API Reference

### Fetch Operations
```typescript
// Get all trucks
fetchTrucks(): Promise<Truck[]>

// Get truck by ID
fetchTruckById(id: string): Promise<Truck>

// Get containers for a truck
fetchContainersByTruck(truckId: string): Promise<Container[]>

// Get stocks in a container
fetchStocksByContainer(containerId: string): Promise<Stock[]>

// Get route history for a truck
fetchTruckRoutes(truckId: string): Promise<TruckRoute[]>
```

### Mutation Operations
```typescript
// Create/Update trucks
createTruck(truck): Promise<Truck>
updateTruckLocation(id, lat, lng): Promise<Truck>
updateTruckStatus(id, status): Promise<Truck>

// Container operations
createContainer(container): Promise<Container>
updateContainer(id, updates): Promise<Container>

// Stock operations
addStock(stock): Promise<Stock>
updateStock(id, updates): Promise<Stock>
deleteStock(id): Promise<void>

// Route tracking
addTruckRoute(truckId, lat, lng): Promise<TruckRoute>
```

## 🐛 Troubleshooting

### Map doesn't load
- Check Supabase credentials in `.env.local`
- Ensure trucks have valid latitude/longitude values

### Real-time updates not working
- Verify Realtime is enabled in Supabase dashboard
- Check browser console for connection errors
- Ensure auth session is valid

### Login fails
- Verify Supabase project is active
- Check email and password are correct
- Confirm auth is enabled in Supabase

## 📞 Support

For issues or feature requests, refer to:
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Leaflet Documentation](https://leafletjs.com/)

## 📄 License

This project is open source and available under the MIT License.

---

**Happy tracking! 🚛📍**
