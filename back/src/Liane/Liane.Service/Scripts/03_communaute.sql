CREATE TABLE route
(
  way_points VARCHAR(24)[]              NOT NULL,
  geometry   geometry(LineString, 4326) NOT NULL,
  PRIMARY KEY (way_points)
);

CREATE INDEX IF NOT EXISTS route_geometry_index
  ON route
    USING gist (geometry);

CREATE TABLE liane
(
  id             UUID,
  name           VARCHAR(100)  NOT NULL,
  way_points     VARCHAR(24)[] NOT NULL,
  round_trip     BOOLEAN       NOT NULL,
  can_drive      BOOLEAN       NOT NULL,
  week_days      VARCHAR(7)    NOT NULL,
  vacation_start TIMESTAMP,
  vacation_end   TIMESTAMP,
  created_by     VARCHAR(24)   NOT NULL,
  created_at     TIMESTAMP     NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE time_constraint
(
  liane_id  UUID        NOT NULL,
  start     TIME        NOT NULL,
  "end"     TIME,
  at        VARCHAR(24) NOT NULL,
  week_days VARCHAR(7)  NOT NULL
);
