CREATE TABLE route
(
  id         UUID,
  way_points VARCHAR(24)[]              NOT NULL,
  geometry   geometry(LineString, 4326) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE (way_points)
);

CREATE INDEX IF NOT EXISTS route_geometry_index
  ON route
    USING gist (geometry);

CREATE TABLE liane
(
  id         UUID,
  name       VARCHAR(100) NOT NULL,
  route_id   UUID         NOT NULL,
  created_by VARCHAR(24)  NOT NULL,
  created_at TIMESTAMP    NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (route_id) REFERENCES route (id)
);

CREATE TABLE car_pooling_constraint
(
  liane_id UUID NOT NULL,
  content  JSON NOT NULL
);
