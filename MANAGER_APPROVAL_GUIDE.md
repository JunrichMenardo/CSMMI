# Manager Approval System - Complete Implementation Guide

## System Overview ✅

The manager approval system ensures that all manager actions (add, edit, delete) require admin approval before execution. This gives admins complete control over what changes are made to the system.

## What's Been Implemented ✅

### 1. **Notifications/Requests Page** (`/dashboard/notifications`)
- **Location:** Sidebar → Manager Requests
- **Features:**
  - View all manager requests (pending, approved, rejected)
  - Filter by status (All, Pending, Approved, Rejected)
  - Real-time updates via Supabase subscriptions
  - Approve or reject requests with admin decision
  - Show rejection reasons to managers

### 2. **Manager Control Settings** (`/dashboard/settings`)
- New "Manager Access Control" section explaining:
  - How the approval system works
  - Protected actions (trucks, containers, stock, markers)
  - Step-by-step workflow
  - Tips for managing requests

### 3. **Sidebar Navigation**
- Added "Manager Requests" link with bell icon
- Shows pending request count when available

### 4. **Database Tables** (Already created)
- `managers` - tracks manager accounts
- `manager_requests` - tracks all pending/approved/rejected actions

### 5. **Utility Functions** (`lib/managerUtils.ts`)
- `isUserManager(userId)` - Check if user is a manager
- `getManagerId(userId)` - Get manager's database ID
- `createManagerRequest()` - Create approval request

## How to Integrate into Existing Components 🔧

### Step 1: Update Add Truck Component

**File:** `components/AddTruckForm.tsx` or equivalent

```typescript
import { isUserManager, createManagerRequest } from '@/lib/managerUtils';

// In your submit handler:
const handleAddTruck = async (truckData) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (await isUserManager(session.user.id)) {
    // Manager - create request
    const managerId = await getManagerId(session.user.id);
    const created = await createManagerRequest(
      managerId,
      'add_truck',
      'truck',
      truckData
    );
    
    if (created) {
      alert('Request submitted for admin approval');
      // Don't add to DB, wait for approval
    }
  } else {
    // Admin - add directly to DB
    await supabase.from('trucks').insert([truckData]);
  }
};
```

### Step 2: Update Edit Truck Component

```typescript
const handleEditTruck = async (truckId, updatedData) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (await isUserManager(session.user.id)) {
    const managerId = await getManagerId(session.user.id);
    await createManagerRequest(
      managerId,
      'edit_truck',
      'truck',
      updatedData,
      truckId  // entity ID
    );
    alert('Edit request submitted for approval');
  } else {
    await supabase.from('trucks')
      .update(updatedData)
      .eq('id', truckId);
  }
};
```

### Step 3: Update Delete Truck Component

```typescript
const handleDeleteTruck = async (truckId) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (await isUserManager(session.user.id)) {
    const managerId = await getManagerId(session.user.id);
    await createManagerRequest(
      managerId,
      'delete_truck',
      'truck',
      { id: truckId },  // action_data
      truckId
    );
    alert('Delete request submitted for approval');
  } else {
    await supabase.from('trucks')
      .delete()
      .eq('id', truckId);
  }
};
```

### Step 4: Repeat for Containers and Stock

Apply the same pattern to:
- `add_container`, `edit_container`, `delete_container`
- `add_stock`, `edit_stock`, `delete_stock`

## Manager Request Workflow 🔄

### 1. Manager Initiates Action
```
Manager → Clicks "Add Truck" → Fills form → Clicks "Save"
```

### 2. System Creates Request
```
Instead of adding to DB, creates record in manager_requests table:
- status: 'pending'
- request_type: 'add_truck'
- action_data: { truck data }
- created_at: now
```

### 3. Admin Sees Notification
```
Admin → Sidebar → "Manager Requests" → Shows pending count
```

### 4. Admin Reviews
```
Admin opens notification → Sees:
- Manager email
- Action type
- Request data (JSON)
- When it was requested
```

### 5. Admin Decision
```
Option A: Click "Approve"
  → Updates request status to 'approved'
  → Executes action (inserts/updates/deletes from DB)

Option B: Click "Reject"
  → Shows rejection reason input
  → Updates request status to 'rejected'
  → Stores rejection reason
  → Manager can see why it was rejected
```

## Database Request Structure 📊

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "manager_id": "uuid-of-manager",
  "request_type": "add_truck",
  "entity_type": "truck",
  "entity_id": null,
  "action_data": {
    "plate_number": "ABC-1234",
    "model": "Hino 500",
    "capacity": 25000,
    "driver_name": "John Doe"
  },
  "status": "pending",
  "created_at": "2026-04-27T10:30:00Z",
  "reviewed_at": null,
  "reviewed_by": null,
  "rejection_reason": null
}
```

## Key Features 🎯

✅ **Real-time Updates**
- Uses Supabase subscriptions for instant notifications
- Admin sees new requests without page refresh

✅ **Audit Trail**
- All requests logged with timestamps
- Shows who reviewed (admin) and when
- Stores rejection reasons

✅ **Complete Control**
- Admins can reject any request
- Can provide feedback via rejection reason
- Can review all historical requests

✅ **User Experience**
- Managers get instant feedback
- Clear indication that request is pending
- Notification of approval/rejection

## Testing the System 🧪

### Test 1: Create Manager Account
1. Go to Settings → System Manager Management
2. Create manager: `manager@test.com` / `password123`
3. Logout and login as manager

### Test 2: Manager Add Truck
1. Login as manager
2. Click "Truck Management" → Add Truck
3. Fill form and submit
4. Should see "Request submitted for approval"
5. Truck NOT added to database yet

### Test 3: Admin Review
1. Logout (manager)
2. Login as admin
3. Go to Sidebar → "Manager Requests"
4. See pending request from manager
5. Click "Approve" → Truck added to database
6. Refresh truck list → Truck appears

### Test 4: Reject Request
1. Manager submits another request
2. Admin opens request
3. Click "Reject" and provide reason
4. Request shows as rejected
5. Truck NOT added

## Security Notes 🔒

- Managers CANNOT directly add/edit/delete (requires approval)
- All changes are audited with timestamp + admin name
- Request data is stored in JSON for complete audit trail
- RLS policies ensure only admins can approve
- Managers can only see their own requests

## Next Steps 🚀

1. **Integrate into Truck Component** - Apply the pattern above
2. **Integrate into Container Component** - Same pattern
3. **Integrate into Stock Component** - Same pattern
4. **Add to Location Markers** - For marker additions
5. **Test End-to-End** - Full workflow validation
6. **Deploy** - Push to production

## File References 📁

- `/app/dashboard/notifications/page.tsx` - Notification/request page
- `/lib/managerUtils.ts` - Helper functions
- `/app/dashboard/settings/page.tsx` - Manager control settings
- `/components/Sidebar.tsx` - Navigation updated
- `supabase/migrations/managers_table.sql` - Database schema
