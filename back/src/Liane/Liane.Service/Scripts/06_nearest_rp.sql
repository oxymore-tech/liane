
CREATE OR REPLACE FUNCTION nearest_rp(p geometry(Point, 4326), radius float DEFAULT 5000)
  RETURNS VARCHAR(24)
  immutable
  strict
  parallel safe
  language sql
AS
$$
SELECT rp.id
FROM rallying_point rp
WHERE st_distancesphere(rp.location, p) < radius
ORDER BY st_distancesphere(rp.location, p)
LIMIT 1;
$$;
