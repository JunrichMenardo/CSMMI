-- Add location marker request types to manager_requests table
-- First, drop the old constraints
ALTER TABLE manager_requests DROP CONSTRAINT manager_requests_request_type_check;
ALTER TABLE manager_requests DROP CONSTRAINT manager_requests_entity_type_check;

-- Add new constraints with location marker types
ALTER TABLE manager_requests 
  ADD CONSTRAINT manager_requests_request_type_check 
  CHECK (request_type IN ('add_truck', 'edit_truck', 'delete_truck', 'add_container', 'edit_container', 'delete_container', 'add_stock', 'edit_stock', 'delete_stock', 'add_location_marker', 'delete_location_marker'));

ALTER TABLE manager_requests 
  ADD CONSTRAINT manager_requests_entity_type_check 
  CHECK (entity_type IN ('truck', 'container', 'stock', 'location_marker'));
