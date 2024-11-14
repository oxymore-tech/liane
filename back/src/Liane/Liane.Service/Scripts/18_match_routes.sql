
CREATE TYPE route_match AS (
                             pickup geometry,
                             deposit geometry,
                             is_reverse_direction boolean
                           );

CREATE OR REPLACE FUNCTION match_routes(a geometry, intersection geometry)
  RETURNS route_match
  language plpgsql
AS
$$
DECLARE
  ordered_points RECORD;
  result route_match;
  pickup geometry;
  deposit geometry;
  start_position float;
  end_position float;
BEGIN

  WITH ordered_points AS (
    SELECT geom, ST_LineLocatePoint(a, geom) AS position
    FROM (SELECT (ST_DumpPoints(intersection)).geom AS geom) AS points
  )

  SELECT first_point.geom, first_point.position, last_point.geom, last_point.position
  FROM (
         SELECT geom, position
         FROM ordered_points
         ORDER BY position
         LIMIT 1
       ) AS first_point,
       (
         SELECT geom, position
         FROM ordered_points
         ORDER BY position DESC
         LIMIT 1
       ) AS last_point
  INTO pickup, start_position, deposit, end_position;

  if start_position > end_position then
    result.pickup = deposit;
    result.deposit = pickup;
    result.is_reverse_direction = true;
  else
    result.pickup = pickup;
    result.deposit = deposit;
    result.is_reverse_direction = false;
  end if;

  return result;
END
$$;
