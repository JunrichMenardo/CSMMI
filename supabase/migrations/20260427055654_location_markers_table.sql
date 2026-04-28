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

-- Create policies for location_markers (without accessing auth.users table)
-- Everyone authenticated can SELECT (read)
CREATE POLICY "Everyone can read location markers" ON location_markers
  FOR SELECT USING (auth.role() = 'authenticated');

-- Admins (users NOT in active managers) can INSERT
CREATE POLICY "Admins can insert location markers" ON location_markers
  FOR INSERT WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM managers
      WHERE managers.user_id = auth.uid()
      AND managers.status = 'active'
    )
  );

-- Admins can UPDATE
CREATE POLICY "Admins can update location markers" ON location_markers
  FOR UPDATE USING (
    NOT EXISTS (
      SELECT 1 FROM managers
      WHERE managers.user_id = auth.uid()
      AND managers.status = 'active'
    )
  );

-- Admins can DELETE
CREATE POLICY "Admins can delete location markers" ON location_markers
  FOR DELETE USING (
    NOT EXISTS (
      SELECT 1 FROM managers
      WHERE managers.user_id = auth.uid()
      AND managers.status = 'active'
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_location_markers_type ON location_markers(type);
CREATE INDEX idx_location_markers_created_at ON location_markers(created_at);