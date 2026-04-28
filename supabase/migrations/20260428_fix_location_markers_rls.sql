-- Fix location_markers RLS policies to not access auth.users table
-- This resolves "permission denied for table users" errors

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can manage all location markers" ON location_markers;
DROP POLICY IF EXISTS "Managers can read location markers" ON location_markers;

-- Create new policies that don't access auth.users
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
