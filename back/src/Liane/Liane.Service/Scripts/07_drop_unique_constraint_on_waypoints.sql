ALTER TABLE liane_request
  DROP CONSTRAINT liane_request_way_points_created_by_key;

CREATE INDEX ON liane_request (way_points);