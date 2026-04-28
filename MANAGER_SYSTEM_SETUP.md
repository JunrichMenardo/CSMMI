# Manager System Implementation Guide

## What's Been Implemented ✅

### 1. **Admin Settings UI**
- ✅ System Manager Management section in Admin Settings
- ✅ Add new manager form with email and password
- ✅ Active managers list with delete functionality
- ✅ Success/error messages for manager creation
- ✅ Manager permissions info panel

### 2. **Header & Sidebar**
- ✅ Removed duplicate logout button from header
- ✅ Logout button available in sidebar (red button at bottom)

### 3. **General Settings**
- ✅ Removed System Version field
- ✅ Kept System Name and Default Map Region (read-only)

### 4. **Database Schema**
- ✅ Created SQL migration file for managers table
- ✅ Created manager_requests table for tracking requests
- ✅ Added RLS (Row Level Security) policies

## How to Set Up ⚙️

### Step 1: Run Supabase Migration
1. Go to **Supabase Dashboard** → Your Project
2. Open **SQL Editor**
3. Copy all SQL from `supabase/migrations/managers_table.sql`
4. Paste and execute it
5. Verify tables are created: `managers` and `manager_requests`

### Step 2: Test Manager Creation
1. Go to Admin Settings → System Manager Management
2. Enter manager email: `manager@test.com`
3. Enter password: `password123` (min 6 chars)
4. Click "Create Manager Account"
5. Should see success message
6. Manager appears in "Active Managers" list

## Manager Workflow 🔄

### Current State (Implemented)
1. **Admin** creates manager account in settings
2. **Manager** receives login credentials
3. Manager can login to the system

### Next Steps to Implement (Planned)
1. **Manager** tries to add/edit/delete truck, container, or stock
2. Instead of direct action → **create a request** in manager_requests table
3. **Admin Dashboard** shows pending manager requests
4. **Admin** reviews and clicks "Approve" or "Reject"
5. If approved → action is executed automatically
6. If rejected → shows reason to manager

## Database Tables Created 📊

### managers table
```
- id (UUID, primary key)
- user_id (references auth.users)
- email (unique)
- status (active/inactive)
- created_at, updated_at
```

### manager_requests table
```
- id (UUID, primary key)
- manager_id (references managers)
- request_type (add_truck, edit_truck, delete_truck, etc.)
- entity_type (truck, container, stock)
- entity_id (what is being modified)
- action_data (JSONB - the actual data)
- status (pending, approved, rejected)
- rejection_reason (why admin rejected)
- created_at, reviewed_at
- reviewed_by (which admin reviewed it)
```

## What Happens When Manager Wants to Add Truck 🚚

### Current Flow (Without Approval)
1. Manager fills truck form
2. Clicks "Add Truck"
3. Truck is added immediately to database

### Desired Flow (With Approval)
1. Manager fills truck form
2. Clicks "Add Truck"
3. Instead of adding → creates a request in manager_requests table
4. Request has status = "pending"
5. Request data stored in action_data (JSONB)
6. Admin sees notification in dashboard
7. Admin clicks "Approve" or "Reject"
8. If approved: truck data inserted into trucks table
9. If rejected: request marked as "rejected" with reason

## Example Manager Request Data 📋

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "manager_id": "uuid-of-manager",
  "request_type": "add_truck",
  "entity_type": "truck",
  "action_data": {
    "plate_number": "ABC-1234",
    "model": "Hino 500",
    "capacity": 25000,
    "driver_name": "John Doe",
    "driver_contact": "09123456789",
    "origin_location": "Manila|14.5994|120.9842",
    "destination": "Cebu|10.3157|123.8854"
  },
  "status": "pending",
  "created_at": "2026-04-27T10:30:00Z"
}
```

## Files Created/Modified 📁

### Created:
- `supabase/migrations/managers_table.sql` - Database schema

### Modified:
- `app/dashboard/settings/page.tsx` - Added manager management UI
- `components/Header.tsx` - Removed duplicate logout button

## Testing Checklist ✓

- [ ] Run SQL migration in Supabase
- [ ] Create a test manager account via Admin Settings
- [ ] Verify manager appears in Active Managers list
- [ ] Try deleting a manager (mark as inactive)
- [ ] Logout and test manager login credentials
- [ ] Verify manager can access dashboard with limited permissions

## Next Phase: Request Approval System 🔜

When ready to implement approval workflow:
1. Create `AdminDashboard` request panel
2. Hook into all CRUD operations (add/edit/delete) for trucks, containers, stock
3. Check if user is manager → create request instead of direct action
4. Fetch pending requests in admin dashboard
5. Add approve/reject buttons with reason input
6. Execute action on approval, update request status
