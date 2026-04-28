-- Create archives table for keeping archived entities
-- Run this in Supabase SQL editor to enable archive functionality

CREATE TABLE IF NOT EXISTS archives (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id uuid,
  name text,
  type text,
  payload jsonb,
  archived_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Optional index for quick lookups
CREATE INDEX IF NOT EXISTS idx_archives_entity_id ON archives(entity_id);
CREATE INDEX IF NOT EXISTS idx_archives_type ON archives(type);
