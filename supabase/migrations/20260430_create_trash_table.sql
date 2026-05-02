-- Create trash table for recently deleted items
CREATE TABLE IF NOT EXISTS trash (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('truck', 'container', 'stock')),
  entity_data JSONB NOT NULL,
  deleted_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_trash_entity_type ON trash(entity_type);
CREATE INDEX IF NOT EXISTS idx_trash_deleted_at ON trash(deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_trash_entity_id ON trash(entity_id);

-- Enable RLS
ALTER TABLE trash ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own trash (authenticated users)
CREATE POLICY "Users can view trash" ON trash
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS Policy: Users can delete from trash (for permanent deletion)
CREATE POLICY "Users can delete from trash" ON trash
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- RLS Policy: Users can insert into trash
CREATE POLICY "Users can insert into trash" ON trash
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
