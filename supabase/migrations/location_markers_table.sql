-- Create location_markers table for storing location markers with approval workflow
CREATE TABLE IF NOT EXISTS location_markers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('port', 'store', 'plant')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE location_markers ENABLE ROW LEVEL SECURITY;

-- Create policies for location_markers
-- Admins can do everything
CREATE POLICY "Admins can manage all location markers" ON location_markers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.id NOT IN (
        SELECT user_id FROM managers WHERE status = 'active'
      )
    )
  );

-- Managers can only read location markers
CREATE POLICY "Managers can read location markers" ON location_markers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM managers
      WHERE managers.user_id = auth.uid()
      AND managers.status = 'active'
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_location_markers_type ON location_markers(type);
CREATE INDEX idx_location_markers_created_at ON location_markers(created_at);