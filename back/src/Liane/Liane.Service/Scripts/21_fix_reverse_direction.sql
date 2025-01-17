DROP FUNCTION match_routes(geometry, geometry);

DROP TYPE route_match;

CREATE TYPE route_match AS (
                             score double precision, 
                             pickup geometry,
                             deposit geometry,
                             is_reverse_direction boolean
                           );

CREATE OR REPLACE FUNCTION match_routes(a geometry, b geometry) returns route_match
  LANGUAGE plpgsql
  IMMUTABLE -- Declare the function as immutable
as
$$
DECLARE
  intersection geometry;
  
  ordered_points RECORD;
  result route_match;
  pickup geometry;
  deposit geometry;
  start_index integer;
  end_index integer;
  start_position float;
  end_position float;
  
  start_position_on_b float;
  end_position_on_b float;
  
BEGIN
  
  SELECT ST_Intersection(a, b) INTO intersection;
  
  SELECT st_length(intersection) / st_length(a) INTO result."score";

  WITH
    ordered_points AS (
      SELECT geom, index, ST_LineLocatePoint(a, geom) AS position, ST_LineLocatePoint(b, geom) AS position_on_b
      FROM (SELECT (ST_DumpPoints(intersection)).geom AS geom, (ST_DumpPoints(intersection)).path[1] AS index) AS points
    )

  SELECT first_point.geom, first_point.index, first_point.position, first_point.position_on_b,
         last_point.geom, last_point.index, last_point.position, last_point.position_on_b
  FROM (
         SELECT geom, index, position, position_on_b
         FROM ordered_points
         ORDER BY position
         LIMIT 1
       ) AS first_point,
       (
         SELECT geom, index, position, position_on_b
         FROM ordered_points
         ORDER BY position DESC
         LIMIT 1
       ) AS last_point
  INTO pickup, start_index, start_position, start_position_on_b, deposit, end_index, end_position, end_position_on_b;
  
  RAISE LOG 'start_position: %, end_position: %, start_position_on_b: %, end_position_on_b: %', start_position, end_position, start_position_on_b, end_position_on_b;
  
  SELECT start_position_on_b > end_position_on_b INTO result.is_reverse_direction;

  IF result.is_reverse_direction THEN
    result.pickup = deposit;
    result.deposit = pickup;
  ELSE
    result.pickup = pickup;
    result.deposit = deposit;
  END IF;

  return result;
END
$$;