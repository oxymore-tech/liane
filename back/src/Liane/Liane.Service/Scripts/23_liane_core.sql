
CREATE TYPE liane_core_result AS
(
  id             uuid,
  liane_requests uuid[],
  intersection   geometry
);

CREATE OR REPLACE FUNCTION liane_core(liane_ids uuid[])
  RETURNS SETOF liane_core_result
  LANGUAGE plpgsql
  IMMUTABLE
AS
$$
DECLARE
  geom_by_liane     RECORD;
  geom_array        geometry[];
  intersection_geom geometry;
BEGIN
  FOR geom_by_liane IN
    SELECT lm.liane_id, array_agg(lr.id) as liane_requests, array_agg(r.geometry) AS geometries
    FROM liane_member lm
           INNER JOIN liane_request lr ON lr.id = lm.liane_request_id
           INNER JOIN route r ON r.way_points = lr.way_points
    WHERE lm.joined_at IS NOT NULL
      AND (liane_ids is null OR lm.liane_id = ANY (liane_ids))
    GROUP BY lm.liane_id
    LOOP
      geom_array := geom_by_liane.geometries;
      IF array_length(geom_array, 1) > 0 THEN
        intersection_geom := geom_array[1];
        FOR i IN 2 .. array_length(geom_array, 1)
          LOOP
            intersection_geom := ST_Intersection(intersection_geom, geom_array[i]);
            IF ST_IsEmpty(intersection_geom) THEN
              EXIT;
            END IF;
          END LOOP;
        IF NOT ST_IsEmpty(intersection_geom) THEN
          RETURN NEXT (geom_by_liane.liane_id, geom_by_liane.liane_requests, st_linemerge(intersection_geom));
        END IF;
      END IF;
    END LOOP;
END;
$$;

select * from liane_core(null);