# Architecture & Design Overview

Technical documentation for the Container Stock Monitoring System.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER (Browser)                   │
├─────────────────────────────────────────────────────────────┤
│  Next.js App Router                                         │
│  ├─ /app/auth - Authentication pages                       │
│  ├─ /app/dashboard - Main dashboard                        │
│  └─ /app/dashboard/containers - Container management       │
│                                                              │
│  React 19 Components                                        │
│  ├─ TruckMap (Leaflet.js integration)                      │
│  ├─ TruckList & TruckDetails                               │
│  ├─ StockMonitoring & DashboardStats                       │
│  └─ Header & Layout components                             │
└────────────────┬──────────────────────────────────────────┘
                 │ HTTPS (JSON/Realtime)
                 │
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE BACKEND (PostgreSQL)                  │
├─────────────────────────────────────────────────────────────┤
│  REST API Layer                                             │
│  ├─ GET /tables/trucks                                     │
│  ├─ POST /tables/containers                                │
│  └─ UPDATE /tables/stocks                                  │
│                                                              │
│  Realtime Subscriptions                                     │
│  ├─ trucks (location updates)                              │
│  ├─ containers (status changes)                            │
│  ├─ stocks (inventory updates)                             │
│  └─ truck_routes (GPS history)                             │
│                                                              │
│  PostgreSQL Database                                        │
│  └─ Relational schema with foreign keys & indexes          │
│                                                              │
│  Authentication                                             │
│  └─ Email/Password with JWT sessions                       │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
USER INPUT (Map Click)
    ↓
React Component
    ↓
Zustand Store (State Management)
    ↓
API Call (lib/api.ts)
    ↓
Supabase Client (lib/supabase.ts)
    ↓
PostgreSQL Query
    ↓
Response + Realtime Event
    ↓
UI Re-render
```

## Component Architecture

### Page Components (in /app)

```typescript
layout.tsx
├─ auth/page.tsx
│  └─ Login/Register form
├─ dashboard/page.tsx
│  ├─ Header
│  ├─ DashboardStats
│  ├─ TruckMap (main feature)
│  ├─ TruckList
│  └─ TruckDetails (on truck select)
└─ dashboard/containers/page.tsx
   ├─ Header
   ├─ Container List
   ├─ Container Details
   └─ StockMonitoring
```

### Reusable Components (in /components)

| Component | Purpose | State |
|-----------|---------|-------|
| Header | App title & logout button | -prop based |
| DashboardStats | 3 key metrics display | computed |
| TruckList | Scrollable list of trucks | selected truck (prop) |
| TruckDetails | Panel with truck info & containers | truck data (prop) |
| TruckMap | Leaflet map with markers & polylines | Zustand store |
| StockMonitoring | Table of items in container | container ID (prop) |

## State Management - Zustand Store

Located in `/lib/store.ts`

```typescript
MapStore {
  // State
  trucks: Truck[]
  selectedTruckId: string | null
  routes: { [truckId: string]: TruckRoute[] }
  loading: boolean
  error: string | null

  // Actions
  setTrucks(trucks)
  addTruck(truck)
  updateTruck(truck)
  setSelectedTruck(id)
  addRoute(truckId, route)
  setRoutes(truckId, routes)
  setLoading(bool)
  setError(message)
}
```

### Why Zustand?
- Lightweight (~2KB)
- Minimal boilerplate
- Flexible API
- Works great with React 19
- Perfect for mid-size app state

## API Layer Architecture

### Fetch Operations (`lib/api.ts`)

```typescript
// Trucks
fetchTrucks()                      // All trucks
fetchTruckById(id)                 // Single truck
createTruck(data)                  // Create new
updateTruckLocation(id, lat, lng)  // GPS update
updateTruckStatus(id, status)      // Status change
deleteTruck(id)                    // Remove

// Containers
fetchContainers()                  // All containers
fetchContainersByTruck(truckId)    // For specific truck
createContainer(data)              // Create
updateContainer(id, updates)       // Update
deleteContainer(id)                // Delete (cascading)

// Stocks
fetchStocks()                      // All stocks
fetchStocksByContainer(id)         // For specific container
addStock(data)                     // Create
updateStock(id, updates)           // Update
deleteStock(id)                    // Delete

// Routes
fetchTruckRoutes(truckId)          // Get history
addTruckRoute(truckId, lat, lng)   // Add point
```

### Realtime Subscriptions (`lib/supabase.ts`)

```typescript
// Listen for truck updates
subscribeToTrucks(callback)
subscribeToTruckLocation(truckId, callback)
subscribeToRoutes(truckId, callback)
```

## Database Schema Design

### Relationships

```
trucks (1) ──── (N) containers
                    │
                    └──── (N) stocks

trucks (1) ──── (N) truck_routes
```

### Indexes for Performance

```sql
CREATE INDEX idx_containers_truck_id ON containers(truck_id);
CREATE INDEX idx_stocks_container_id ON stocks(container_id);
CREATE INDEX idx_truck_routes_truck_id ON truck_routes(truck_id);
CREATE INDEX idx_truck_routes_timestamp ON truck_routes(timestamp);
```

## Authentication Flow

```
1. User enters email/password on /auth
2. Supabase Auth validates credentials
3. Returns JWT token + session
4. Stored in browser session
5. Attached to all API requests
6. Dashboard checks session on load
7. Redirects to /auth if no session
8. Logout clears session
```

## Real-Time Data Flow

```
DATABASE CHANGES
    ↓
Supabase Realtime (WebSocket)
    ↓
Browser Subscription Listener
    ↓
Update Zustand Store
    ↓
React Component Re-render
    ↓
Map/UI Updates Instantly
```

**Latency**: Typically < 100ms for realtime updates

## File Organization

```
lib/
├─ supabase.ts          (Initialization, subscriptions)
├─ api.ts               (Data operations)
├─ store.ts             (Zustand state)
└─ hooks.ts             (Custom React hooks)

components/
├─ Header.tsx
├─ DashboardStats.tsx
├─ TruckMap.tsx
├─ TruckList.tsx
├─ TruckDetails.tsx
├─ StockMonitoring.tsx
└─ index.ts             (Barrel export)

types/
└─ index.ts             (All TypeScript types)

app/
├─ layout.tsx           (Root layout)
├─ page.tsx             (Home redirect)
├─ globals.css          (Global styles)
├─ auth/page.tsx        (Login page)
└─ dashboard/
   ├─ page.tsx          (Main dashboard)
   └─ containers/page.tsx
```

## Performance Optimizations

### 1. Code Splitting
- Next.js automatically code-splits at route level
- Dynamic imports for heavy components

```typescript
const TruckMap = dynamic(() => import('@/components/TruckMap'), {
  ssr: false,
  loading: () => <LoadingSpinner />
});
```

### 2. Database Queries
- Only fetch necessary columns
- Use indexes for frequently queried fields
- Pagination for large result sets (if needed)

### 3. Caching
- Supabase auto-caches responses
- Realtime keeps data fresh
- Browser cache for static assets

### 4. Bundle Size
- Tree-shaking unused code
- Minification in production build
- Image optimization

## Security Considerations

### Frontend Security
```typescript
// ✅ Good: Use environment variables
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL

// ❌ Bad: Hardcoded secrets
const KEY = 'pk_supabase_key_123'
```

### Backend Security
- Enable Row Level Security (RLS) in Supabase
- Validate all inputs server-side
- Use HTTPS for all connections
- Store sensitive data securely

### Authentication
- JWT tokens used for session
- Tokens expire automatically
- Logout clears session
- CORS configured for authorized domains

## Testing Strategy

### Unit Tests (Recommended)
```typescript
import { describe, it, expect } from 'vitest'
import { fetchTrucks } from '@/lib/api'

describe('API', () => {
  it('fetches trucks from Supabase', async () => {
    const trucks = await fetchTrucks()
    expect(trucks).toBeInstanceOf(Array)
    expect(trucks[0]).toHaveProperty('latitude')
  })
})
```

### Integration Tests
- Test real Supabase connection
- Verify data relationships
- Test subscription lifecycle

### E2E Tests
- Test complete user flows
- Login → View Dashboard → Track Truck
- Use Playwright or Cypress

## Deployment Architecture

### Local Development
```
npm run dev
→ Next.js dev server on localhost:3000
→ Hot reload on code changes
→ Connected to dev Supabase project
```

### Production Build
```
npm run build
→ Optimized bundle
→ Static files
→ Ready for deployment
```

### Vercel Deployment
```
GitHub Push
→ Vercel auto-triggers build
→ Environment variables loaded
→ CDN distribution
→ Auto-HTTPS
→ Live at custom domain
```

## Monitoring & Logging

### Key Metrics to Monitor
- Realtime subscription latency
- API response times
- Error rates
- User sessions
- Map load times

### Logging Approach
```typescript
console.error('Failed to fetch trucks:', err)
// In production, send to logging service
```

## Future Enhancements

Possible improvements:
1. **Offline Support** - Service Workers + IndexedDB
2. **Advanced Analytics** - Route optimization, ETA prediction
3. **Notifications** - WebPush for alerts
4. **Mobile App** - React Native version
5. **Multi-language** - i18n support
6. **Dark Mode** - Theme toggle
7. **Advanced Search** - Filters, full-text search
8. **Report Generation** - PDF exports
9. **2FA** - Enhanced security
10. **Custom Geofences** - Alert on boundary crossing

---

For development questions, refer to component source code and inline comments.
