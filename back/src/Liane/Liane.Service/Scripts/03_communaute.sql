CREATE TABLE liane (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  way_points VARCHAR(24)[] NOT NULL,
  created_by VARCHAR(24) NOT NULL,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE car_pooling_constraint (
  liane_id UUID NOT NULL,
  content JSON NOT NULL
);