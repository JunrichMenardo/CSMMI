# Sample Data & Testing Guide

Complete guide for adding test data and testing the application.

## Quick Start - Add Sample Data

### Simple SQL Queries

Copy and paste these in Supabase SQL Editor one at a time.

#### 1. Insert a Test Truck

```sql
INSERT INTO trucks (driver_name, plate_number, latitude, longitude, status)
VALUES 
  ('John Doe', 'ABC-123', 28.7041, 77.1025, 'Delivering'),
  ('Jane Smith', 'XYZ-789', 28.5355, 77.3910, 'Idle'),
  ('Mike Johnson', 'MNO-456', 28.6139, 77.2090, 'Returning');
```

**Expected Output**: 3 rows inserted with IDs

#### 2. Insert Containers

Replace `[TRUCK_ID]` with the ID from the previous query (visible in output).

```sql
INSERT INTO containers (container_id, truck_id, status)
VALUES 
  ('CNT-001', '[TRUCK_ID_1]', 'In Transit'),
  ('CNT-002', '[TRUCK_ID_1]', 'Loaded'),
  ('CNT-003', '[TRUCK_ID_2]', 'Delivered'),
  ('CNT-004', '[TRUCK_ID_3]', 'In Transit');
```

#### 3. Insert Stock Items

Replace `[CONTAINER_ID]` with container IDs from previous output.

```sql
INSERT INTO stocks (container_id, item_name, quantity, unit)
VALUES 
  ('[CONTAINER_ID_1]', 'Ceramic Tiles', 500, 'boxes'),
  ('[CONTAINER_ID_1]', 'Paint - Red', 250, 'cans'),
  ('[CONTAINER_ID_1]', 'Wood Planks', 1000, 'kg'),
  ('[CONTAINER_ID_2]', 'Steel Rods', 2000, 'kg'),
  ('[CONTAINER_ID_2]', 'Cement Bags', 300, 'bags');
```

#### 4. Add Route History

This creates a path for the truck on the map.

```sql
INSERT INTO truck_routes (truck_id, latitude, longitude, timestamp)
VALUES 
  ('[TRUCK_ID_1]', 28.7041, 77.1025, NOW() - INTERVAL '30 minutes'),
  ('[TRUCK_ID_1]', 28.7150, 77.1100, NOW() - INTERVAL '24 minutes'),
  ('[TRUCK_ID_1]', 28.7250, 77.1200, NOW() - INTERVAL '18 minutes'),
  ('[TRUCK_ID_1]', 28.7300, 77.1250, NOW() - INTERVAL '12 minutes'),
  ('[TRUCK_ID_1]', 28.7350, 77.1300, NOW() - INTERVAL '6 minutes'),
  ('[TRUCK_ID_1]', 28.7400, 77.1350, NOW());
```

## Complete Sample Dataset

Run this complete script to populate all sample data at once:

```sql
-- Step 1: Insert Trucks
INSERT INTO trucks (driver_name, plate_number, latitude, longitude, status)
VALUES 
  ('John Doe', 'ABC-123', 28.7041, 77.1025, 'Delivering'),
  ('Jane Smith', 'XYZ-789', 28.5355, 77.3910, 'Idle'),
  ('Mike Johnson', 'MNO-456', 28.6139, 77.2090, 'Returning'),
  ('Sarah Williams', 'DEF-234', 28.6292, 77.2197, 'Delivering'),
  ('Robert Brown', 'GHI-567', 28.7589, 77.1550, 'Idle')
RETURNING id, plate_number;

-- Step 2: Get truck IDs (you'll see them in results above)
-- Save these IDs for the next step

-- Step 3: Insert Containers (replace [ID_1], [ID_2], etc. with actual IDs)
INSERT INTO containers (container_id, truck_id, status)
VALUES 
  ('CNT-001', (SELECT id FROM trucks WHERE plate_number = 'ABC-123'), 'In Transit'),
  ('CNT-002', (SELECT id FROM trucks WHERE plate_number = 'ABC-123'), 'Loaded'),
  ('CNT-003', (SELECT id FROM trucks WHERE plate_number = 'XYZ-789'), 'Delivered'),
  ('CNT-004', (SELECT id FROM trucks WHERE plate_number = 'MNO-456'), 'In Transit'),
  ('CNT-005', (SELECT id FROM trucks WHERE plate_number = 'DEF-234'), 'Loaded'),
  ('CNT-006', (SELECT id FROM trucks WHERE plate_number = 'GHI-567'), 'In Transit')
RETURNING id, container_id;

-- Step 4: Insert Stocks
INSERT INTO stocks (container_id, item_name, quantity, unit)
VALUES 
  -- Container 1
  ((SELECT id FROM containers WHERE container_id = 'CNT-001'), 'Ceramic Tiles', 500, 'boxes'),
  ((SELECT id FROM containers WHERE container_id = 'CNT-001'), 'Paint - Red', 250, 'cans'),
  
  -- Container 2
  ((SELECT id FROM containers WHERE container_id = 'CNT-002'), 'Wood Planks', 1000, 'kg'),
  ((SELECT id FROM containers WHERE container_id = 'CNT-002'), 'Metal Sheets', 1500, 'kg'),
  
  -- Container 3
  ((SELECT id FROM containers WHERE container_id = 'CNT-003'), 'Steel Rods', 2000, 'kg'),
  ((SELECT id FROM containers WHERE container_id = 'CNT-003'), 'Iron Pipes', 800, 'kg'),
  
  -- Container 4
  ((SELECT id FROM containers WHERE container_id = 'CNT-004'), 'Cement Bags', 500, 'bags'),
  ((SELECT id FROM containers WHERE container_id = 'CNT-004'), 'Sand', 5000, 'kg'),
  ((SELECT id FROM containers WHERE container_id = 'CNT-004'), 'Concrete Mix', 2000, 'kg'),
  
  -- Container 5
  ((SELECT id FROM containers WHERE container_id = 'CNT-005'), 'Bricks', 10000, 'pieces'),
  ((SELECT id FROM containers WHERE container_id = 'CNT-005'), 'Mortar', 1500, 'kg'),
  
  -- Container 6
  ((SELECT id FROM containers WHERE container_id = 'CNT-006'), 'Glass Sheets', 100, 'pieces'),
  ((SELECT id FROM containers WHERE container_id = 'CNT-006'), 'Aluminum Frames', 200, 'pieces');

-- Step 5: Insert Route History (for truck simulation)
INSERT INTO truck_routes (truck_id, latitude, longitude, timestamp)
VALUES 
  -- ABC-123 route (complete path)
  ((SELECT id FROM trucks WHERE plate_number = 'ABC-123'), 28.7041, 77.1025, NOW() - INTERVAL '30 minutes'),
  ((SELECT id FROM trucks WHERE plate_number = 'ABC-123'), 28.7150, 77.1100, NOW() - INTERVAL '24 minutes'),
  ((SELECT id FROM trucks WHERE plate_number = 'ABC-123'), 28.7250, 77.1200, NOW() - INTERVAL '18 minutes'),
  ((SELECT id FROM trucks WHERE plate_number = 'ABC-123'), 28.7300, 77.1250, NOW() - INTERVAL '12 minutes'),
  ((SELECT id FROM trucks WHERE plate_number = 'ABC-123'), 28.7350, 77.1300, NOW() - INTERVAL '6 minutes'),
  ((SELECT id FROM trucks WHERE plate_number = 'ABC-123'), 28.7400, 77.1350, NOW()),
  
  -- MNO-456 route
  ((SELECT id FROM trucks WHERE plate_number = 'MNO-456'), 28.6139, 77.2090, NOW() - INTERVAL '20 minutes'),
  ((SELECT id FROM trucks WHERE plate_number = 'MNO-456'), 28.6200, 77.2150, NOW() - INTERVAL '15 minutes'),
  ((SELECT id FROM trucks WHERE plate_number = 'MNO-456'), 28.6250, 77.2200, NOW() - INTERVAL '10 minutes'),
  ((SELECT id FROM trucks WHERE plate_number = 'MNO-456'), 28.6280, 77.2230, NOW()),
  
  -- DEF-234 route
  ((SELECT id FROM trucks WHERE plate_number = 'DEF-234'), 28.6292, 77.2197, NOW() - INTERVAL '40 minutes'),
  ((SELECT id FROM trucks WHERE plate_number = 'DEF-234'), 28.6350, 77.2250, NOW() - INTERVAL '30 minutes'),
  ((SELECT id FROM trucks WHERE plate_number = 'DEF-234'), 28.6400, 77.2300, NOW() - INTERVAL '20 minutes'),
  ((SELECT id FROM trucks WHERE plate_number = 'DEF-234'), 28.6450, 77.2350, NOW());
```

## Testing Real-Time Updates

### Test 1: Update Truck Location

```sql
-- Update ABC-123 position
UPDATE trucks 
SET latitude = 28.7450, longitude = 77.1400, updated_at = NOW()
WHERE plate_number = 'ABC-123';
```

Expected: Map marker moves in real-time to new location

### Test 2: Add New Route Point

```sql
-- Add new position to truck's route
INSERT INTO truck_routes (truck_id, latitude, longitude, timestamp)
VALUES 
  ((SELECT id FROM trucks WHERE plate_number = 'ABC-123'), 28.7500, 77.1450, NOW());
```

Expected: New point appears on route polyline

### Test 3: Update Container Status

```sql
-- Change container status
UPDATE containers 
SET status = 'Delivered', updated_at = NOW()
WHERE container_id = 'CNT-001';
```

Expected: Container status updates in real-time in UI

### Test 4: Add New Stock

```sql
-- Add new item to container
INSERT INTO stocks (container_id, item_name, quantity, unit)
VALUES 
  ((SELECT id FROM containers WHERE container_id = 'CNT-001'), 'New Product', 100, 'boxes');
```

Expected: New stock appears in monitoring table

## Cleanup - Clear All Sample Data

If you want to start fresh:

```sql
-- WARNING: This deletes all data!
DELETE FROM truck_routes;
DELETE FROM stocks;
DELETE FROM containers;
DELETE FROM trucks;

-- Verify deletion
SELECT COUNT(*) FROM trucks;        -- Should show 0
SELECT COUNT(*) FROM containers;   -- Should show 0
SELECT COUNT(*) FROM stocks;       -- Should show 0
SELECT COUNT(*) FROM truck_routes; -- Should show 0
```

## Testing Scenarios

### Scenario 1: Track a Delivery Route

1. Create a truck with 'Delivering' status
2. Add 10 route points (moving truck north)
3. Watch the polyline draw on map
4. Verify all route points appear when truck is selected

```sql
-- Example: Simulate 10-step journey
INSERT INTO truck_routes (truck_id, latitude, longitude, timestamp)
SELECT 
  (SELECT id FROM trucks WHERE plate_number = 'ABC-123'),
  28.7041 + (i * 0.01),  -- Move north
  77.1025 + (i * 0.005), -- Move east  
  NOW() - INTERVAL '1 minute' * (10 - i)
FROM generate_series(0, 9) AS t(i);
```

### Scenario 2: Monitor Stock Levels

1. Create container with multiple items
2. Verify all items appear on Stock table
3. Click different containers to see different stocks

### Scenario 3: Multi-Truck Tracking

1. Create 5 trucks with different locations
2. Verify all appear as markers on map
3. Click each to verify details and containers
4. Add different routes to each
5. Select different trucks and verify routes update

## Performance Testing

### Large Dataset

To test with more data:

```sql
-- Create 100 route points (stresses realtime)
INSERT INTO truck_routes (truck_id, latitude, longitude, timestamp)
SELECT 
  (SELECT id FROM trucks WHERE plate_number = 'ABC-123'),
  28.7041 + (random() * 0.1),
  77.1025 + (random() * 0.1),
  NOW() - INTERVAL '1 minute' * generate_series(0, 99)
FROM generate_series(1, 100);
```

Monitor:
- ✅ Map loads without lag
- ✅ Polyline renders all points
- ✅ Real-time updates are smooth
- ✅ Dashboard stats update correctly

## Verification Checklist

After adding sample data, verify:

- [ ] Dashboard shows correct stats
- [ ] All trucks appear on map
- [ ] Clicking trucks shows correct containers
- [ ] Containers show correct stocks
- [ ] Routes display as polylines
- [ ] Real-time updates work (try updating data)
- [ ] No console errors
- [ ] UI is responsive

## Sample Data Query Examples

### View all trucks with container count

```sql
SELECT 
  t.plate_number,
  t.driver_name,
  t.status,
  COUNT(c.id) as container_count
FROM trucks t
LEFT JOIN containers c ON t.id = c.truck_id
GROUP BY t.id, t.plate_number, t.driver_name, t.status;
```

### View containers with stock count

```sql
SELECT 
  c.container_id,
  c.status,
  COUNT(s.id) as item_count,
  SUM(s.quantity) as total_quantity
FROM containers c
LEFT JOIN stocks s ON c.id = s.container_id
GROUP BY c.id, c.container_id, c.status;
```

### View truck with latest location and route count

```sql
SELECT 
  t.plate_number,
  t.driver_name,
  t.latitude,
  t.longitude,
  COUNT(tr.id) as route_points,
  MAX(tr.timestamp) as last_location_update
FROM trucks t
LEFT JOIN truck_routes tr ON t.id = tr.truck_id
GROUP BY t.id;
```

---

**Happy testing! 🧪🚛**
