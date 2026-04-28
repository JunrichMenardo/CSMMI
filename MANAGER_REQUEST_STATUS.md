# Manager Approval System - Implementation Status

## ✅ COMPLETED - Trucks Operations

### Files Updated:
- `components/AddTruckForm.tsx` - Checks user role, creates request if manager
- `components/EditTruckForm.tsx` - Checks user role, creates edit request if manager, delete request if manager
- `app/dashboard/trucks/page.tsx` - Handles delete button with manager request logic

### How It Works (Trucks):
1. Manager clicks "Add Truck" → Form opens
2. Fills in details and clicks "Add Truck"
3. System checks if user is manager:
   - **If Manager**: Creates request, shows alert "Request submitted for admin approval"
   - **If Admin**: Directly adds truck to database
4. Manager can see request in "My Requests" page with "Pending" status
5. Admin can see request in "Manager Requests" page and approve/reject
6. On approval: Truck is automatically added to database

### Same for Edit and Delete operations

---

## ⚠️ IN PROGRESS - Containers Operations

### Files to Update:
- `components/AddContainerForm.tsx` - **PARTIALLY DONE** (imports added, handleSubmit updated)
- `components/EditContainerForm.tsx` - **TODO**
- `app/dashboard/containers/page.tsx` - **TODO** (delete handler)

### Pattern to Follow:
Same as trucks:
1. Add imports: `supabase`, `getUserRole`, `createManagerRequest`, `getManagerId`
2. In handleSubmit: Check `getUserRole()`, if manager → create request, else → direct action
3. In delete handler: Same pattern

---

## ⚠️ TODO - Stocks Operations

### Files to Update:
- `components/AddStockForm.tsx` or wherever stock creation happens
- `components/EditStockForm.tsx` or wherever stock editing happens
- Delete stock handler in stock management page

### Pattern: Same as trucks and containers

---

## ⚠️ TODO - Location Markers

### Files to Update:
- `components/LocationMarkerManager.tsx` - Add marker button handler
- Delete marker button handler

### Pattern: Same as trucks, containers, and stocks

---

## Key Implementation Pattern

Every add/edit/delete operation follows this pattern:

```typescript
const handleAction = async () => {
  try {
    // 1. Get session
    const { data: { session } } = await supabase.auth.getSession();
    
    // 2. Check user role
    const userRole = await getUserRole(session.user.id);
    
    // 3. If manager - create request
    if (userRole === 'manager') {
      const managerId = await getManagerId(session.user.id);
      const created = await createManagerRequest(
        managerId,
        'add_truck',      // or 'edit_truck', 'delete_truck', etc.
        'truck',          // or 'container', 'stock', 'location_marker'
        { ...data },      // the action data
        entityId          // optional: truck_id, container_id, etc.
      );
      
      if (created) {
        alert('✅ Request submitted for admin approval!');
        // Don't update UI - wait for approval
      }
    } else {
      // Admin - perform action directly
      await createTruck(data);
      // Update UI immediately
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

## Testing Checklist

- [ ] Manager adds truck → Request created → Shows in "My Requests" as Pending
- [ ] Manager edits truck → Request created → Shows in "My Requests" as Pending
- [ ] Manager deletes truck → Request created → Shows in "My Requests" as Pending
- [ ] Admin views "Manager Requests" → Sees all pending requests
- [ ] Admin approves request → Action executes, status changes to "Approved"
- [ ] Admin rejects request → Status changes to "Rejected" with reason
- [ ] Manager views "My Requests" → Sees approval/rejection status
- [ ] Admin adds truck directly → Executes immediately (no request created)
- [ ] Admin edits truck directly → Executes immediately (no request created)
- [ ] Admin deletes truck directly → Executes immediately (no request created)

---

## Files Still Needing Updates

1. EditContainerForm.tsx - Add manager check in handleSubmit
2. containers/page.tsx - Add manager check in delete handler
3. AddStockForm.tsx (or equivalent) - Add manager check
4. EditStockForm.tsx (or equivalent) - Add manager check
5. stocks page - Add manager check in delete handler
6. LocationMarkerManager.tsx - Add manager check for add/delete
7. Any other marker management files

---

## Database Ready

The database tables are already set up:
- `managers` table - tracks manager accounts
- `manager_requests` table - tracks all requests (add, edit, delete)
- RLS policies enforced for security
- Real-time subscriptions working for live updates

---

## Real-Time Features Active

- Notifications page subscribes to manager_requests in real-time
- Manager's "My Requests" page subscribes to their requests in real-time
- Approve/reject updates show instantly to manager
- New requests appear instantly to admin
