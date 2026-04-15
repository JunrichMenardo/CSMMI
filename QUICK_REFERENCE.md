# Quick Reference Guide

Fast lookup for common commands and code patterns.

## 🚀 Common Commands

### Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Reinstall dependencies
npm install

# Clean install (fresh)
rm -rf node_modules package-lock.json && npm install
```

### Access URLs (Local Development)
```
http://localhost:3000           # Main app
http://localhost:3000/auth      # Login page
http://localhost:3000/dashboard # Main dashboard
```

---

## 🔐 Supabase Commands

### View Database
1. Go to Supabase project dashboard
2. Click "SQL Editor"
3. Paste queries from [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)

### Common Queries

**View all trucks:**
```sql
SELECT * FROM trucks ORDER BY updated_at DESC;
```

**View truck with all containers:**
```sql
SELECT t.*, COUNT(c.id) as container_count
FROM trucks t
LEFT JOIN containers c ON t.id = c.truck_id
GROUP BY t.id;
```

**View container with all stocks:**
```sql
SELECT c.*, COUNT(s.id) as item_count
FROM containers c
LEFT JOIN stocks s ON c.id = s.container_id
GROUP BY c.id;
```

**Update truck status:**
```sql
UPDATE trucks SET status = 'Delivering' WHERE plate_number = 'ABC-123';
```

**Add location point to route:**
```sql
INSERT INTO truck_routes (truck_id, latitude, longitude, timestamp)
VALUES ('[truck_id]', 28.7100, 77.1200, NOW());
```

---

## 💻 Code Patterns

### Fetch Data from API
```typescript
import { fetchTrucks, fetchStocksByContainer } from '@/lib/api';

// Get all trucks
const trucks = await fetchTrucks();

// Get stocks in container
const stocks = await fetchStocksByContainer(containerId);
```

### Use State Management
```typescript
import { useMapStore } from '@/lib/store';

// In component
const { trucks, selectedTruckId, setSelectedTruck } = useMapStore();

// Select truck
setSelectedTruck(truckId);
```

### Subscribe to Real-Time Updates
```typescript
import { supabase } from '@/lib/supabase';

// Listen for truck location changes
const subscription = supabase
  .from('trucks')
  .on('UPDATE', (payload) => {
    console.log('Truck updated:', payload.new);
  })
  .subscribe();

// Cleanup
subscription.unsubscribe();
```

### Create Component
```typescript
'use client';  // Always client component for interactivity

import { useState, useEffect } from 'react';
import { Truck } from '@/types';

interface MyComponentProps {
  truck: Truck;
}

export const MyComponent: React.FC<MyComponentProps> = ({ truck }) => {
  const [data, setData] = useState<Truck | null>(null);

  useEffect(() => {
    // Load data
  }, []);

  return (
    <div>
      {/* JSX */}
    </div>
  );
};
```

### Add Error Handling
```typescript
try {
  const trucks = await fetchTrucks();
  setTrucks(trucks);
} catch (err) {
  console.error('Failed to load trucks:', err);
  setError('Failed to load data');
} finally {
  setLoading(false);
}
```

---

## 📱 Component Quick Lookup

| Component | Purpose | Location | Props |
|-----------|---------|----------|-------|
| Header | App title & logout | components/Header.tsx | title? |
| TruckMap | Map with realtime | components/TruckMap.tsx | trucks, selectedTruckId, onSelectTruck |
| TruckList | Truck selector | components/TruckList.tsx | trucks, selectedTruckId, onSelectTruck |
| TruckDetails | Truck info panel | components/TruckDetails.tsx | truck |
| StockMonitoring | Stock table | components/StockMonitoring.tsx | containerId, containerName |
| DashboardStats | KPI cards | components/DashboardStats.tsx | trucks, containers, totalStocks |

---

## 🗂️ File Lookup

| Need to... | File Location |
|-----------|----------------|
| Change authentication logic | `app/auth/page.tsx` |
| Modify dashboard layout | `app/dashboard/page.tsx` |
| Edit map component | `components/TruckMap.tsx` |
| Add new data function | `lib/api.ts` |
| Modify Supabase connection | `lib/supabase.ts` |
| Change state management | `lib/store.ts` |
| Add type definitions | `types/index.ts` |
| Update global styles | `app/globals.css` |
| Configure Tailwind | `tailwind.config.ts` |

---

## 🎨 Tailwind CSS Common Classes

```typescript
// Colors
bg-white bg-gray-50 bg-blue-600 bg-red-100
text-white text-gray-600 text-blue-800

// Spacing
p-4 px-6 py-2  // padding
m-4 mx-auto my-2 // margin
gap-4 space-y-2  // gaps

// Display
flex grid hidden block inline-block
flex-col flex-row justify-center items-center

// Sizing
w-full h-96 max-w-7xl min-h-screen

// Effects
shadow rounded-lg border border-gray-200
opacity-50 hover:opacity-100

// Responsive
lg:col-span-2 md:col-span-1 sm:hidden

// Interactions
hover:bg-gray-100 active:scale-95 transition
cursor-pointer pointer-events-none

// Text
font-bold text-center text-lg leading-8
uppercase lowercase capitalize
line-clamp-2
```

---

## 🧩 TypeScript Types

```typescript
// Import types
import { Truck, Container, Stock, TruckRoute } from '@/types';

// Truck type
interface Truck {
  id: string;
  driver_name: string;
  plate_number: string;
  latitude: number;
  longitude: number;
  status: 'Idle' | 'Delivering' | 'Returning';
  updated_at: string;
}

// Container type
interface Container {
  id: string;
  container_id: string;
  truck_id: string;
  status: 'Loaded' | 'In Transit' | 'Delivered';
  updated_at: string;
}

// Stock type
interface Stock {
  id: string;
  container_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  updated_at: string;
}

// Route type
interface TruckRoute {
  id: string;
  truck_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}
```

---

## 🐛 Debug Tips

### Enable Debug Logging
```typescript
// In browser console
localStorage.setItem('debug', '*:*');
// Reload page to see all logs
```

### Check State
```typescript
// In component
console.log('Store state:', useMapStore.getState());
```

### Verify Supabase Connection
```typescript
// In browser console
import { supabase } from '@/lib/supabase';
const { data } = await supabase.auth.getSession();
console.log('Session:', data);
```

### Monitor Network
1. Open DevTools (F12)
2. Click "Network" tab
3. Filter by type: "fetch"
4. Look for Supabase API calls

### Debug Map
```typescript
// In TruckMap component
useEffect(() => {
  console.log('Trucks:', trucks);
  console.log('Selected:', selectedTruckId);
  console.log('Routes:', routes);
}, [trucks, selectedTruckId, routes]);
```

---

## 📋 Environment Variables Needed

```env
# REQUIRED
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OPTIONAL (with defaults)
NEXT_PUBLIC_APP_NAME=Container Stock Monitoring
```

**Find your credentials:**
1. Open Supabase project
2. Go to Settings (gear icon)
3. Click "API"
4. Copy URL and anon key

---

## 🔗 API Methods Quick Reference

### Fetch Operations
```typescript
fetchTrucks()                        // All trucks
fetchTruckById(id)                   // Single truck
fetchContainers()                    // All containers
fetchContainersByTruck(truckId)      // Truck's containers
fetchStocks()                        // All stocks
fetchStocksByContainer(containerId)  // Container's stocks
fetchTruckRoutes(truckId)            // Truck's route history
```

### Mutation Operations
```typescript
createTruck(data)                    // New truck
updateTruckLocation(id, lat, lng)    // Update position
updateTruckStatus(id, status)        // Update status
createContainer(data)                // New container
updateContainer(id, updates)         // Update container
addStock(data)                       // New stock item
updateStock(id, updates)             // Update stock
deleteStock(id)                      // Remove stock
addTruckRoute(truckId, lat, lng)     // Add route point
```

---

## 🎯 Workflow Examples

### Add New Feature
1. Create component in `components/`
2. Add types to `types/index.ts`
3. Add API functions to `lib/api.ts`
4. Import and use in page
5. Add Tailwind styling

### Debug Real-Time Issue
1. Check Realtime enabled in Supabase
2. Verify auth token valid (check DevTools Storage)
3. Look at Network tab for WebSocket connection
4. Check browser console for errors
5. Verify table has data to update

### Add New Database Table
1. Create table in Supabase SQL Editor
2. Add type to `types/index.ts`
3. Add fetch/mutation functions to `lib/api.ts`
4. Add subscription to `lib/supabase.ts`
5. Use in components

---

## 📞 Quick Links

- [Supabase Dashboard](https://supabase.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Leaflet Documentation](https://leafletjs.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## ⏱️ Estimated Time for Tasks

| Task | Time |
|------|------|
| Initial setup | 15 minutes |
| Create account | 5 minutes |
| Set up database | 10 minutes |
| Add sample data | 5 minutes |
| Test all features | 20 minutes |
| Deploy to Vercel | 10 minutes |
| **Total** | **~60 minutes** |

---

## 💡 Pro Tips

- **Git commits often** - Makes rollbacks easier
- **Test locally first** - Catch bugs early
- **Enable debug mode** - While developing
- **Check browser console** - For error messages
- **Monitor Supabase logs** - For backend issues
- **Use TypeScript** - Catch type errors early
- **Keep components small** - Easier to maintain
- **Document your changes** - Future you will thank you
- **Backup database** - Before major changes
- **Test on mobile** - Verify responsive design

---

## 🎓 Next Steps

After setup:

1. **Explore the code** - Read comments in source files
2. **Try modifying UI** - Change Tailwind classes
3. **Add new fields** - Extend database schema
4. **Create new component** - Build a feature
5. **Deploy to production** - Share with users

---

*Last Updated: March 31, 2026*
*Guide Version: 1.0*

**Happy coding! 💻**
