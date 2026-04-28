-- Create managers table for system manager accounts
CREATE TABLE IF NOT EXISTS managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_managers_status ON managers(status);
CREATE INDEX IF NOT EXISTS idx_managers_user_id ON managers(user_id);
CREATE INDEX IF NOT EXISTS idx_managers_email ON managers(email);

-- Enable RLS on managers table
ALTER TABLE managers ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view all managers
CREATE POLICY "Admins can view all managers" ON managers
  FOR SELECT
  USING (true);

-- Create policy for admins to manage managers
CREATE POLICY "Admins can manage managers" ON managers
  FOR ALL
  USING (true);

-- Create manager_requests table for tracking approval requests
CREATE TABLE IF NOT EXISTS manager_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES managers(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('add_truck', 'edit_truck', 'delete_truck', 'add_container', 'edit_container', 'delete_container', 'add_stock', 'edit_stock', 'delete_stock', 'add_location_marker', 'delete_location_marker')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('truck', 'container', 'stock', 'location_marker')),
  entity_id TEXT,
  action_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id)
);

-- Create indexes for manager_requests
CREATE INDEX IF NOT EXISTS idx_manager_requests_manager_id ON manager_requests(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_requests_status ON manager_requests(status);
CREATE INDEX IF NOT EXISTS idx_manager_requests_entity_type ON manager_requests(entity_type);

-- Enable RLS on manager_requests table
ALTER TABLE manager_requests ENABLE ROW LEVEL SECURITY;

-- Policies for manager_requests
CREATE POLICY "Admins can view all requests" ON manager_requests
  FOR SELECT
  USING (true);

CREATE POLICY "Managers can view their own requests" ON manager_requests
  FOR SELECT
  USING (manager_id = (SELECT id FROM managers WHERE user_id = auth.uid()));

CREATE POLICY "Managers can create requests" ON manager_requests
  FOR INSERT
  WITH CHECK (manager_id = (SELECT id FROM managers WHERE user_id = auth.uid()));

CREATE POLICY "Admins can update requests" ON manager_requests
  FOR UPDATE
  USING (true);
