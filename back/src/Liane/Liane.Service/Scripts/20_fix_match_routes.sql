create or replace function match_routes(a geometry, intersection geometry) returns route_match
  language plpgsql
as
$$
DECLARE
  ordered_points RECORD;
  result route_match;
  pickup geometry;
  deposit geometry;
  start_index integer;
  end_index integer;
  start_position float;
  end_position float;
BEGIN

  WITH
    ordered_points AS (
      SELECT geom, index, ST_LineLocatePoint(a, geom) AS position
      FROM (SELECT (ST_DumpPoints(intersection)).geom AS geom, (ST_DumpPoints(intersection)).path[1] AS index) AS points
    )

  SELECT first_point.geom, first_point.index, first_point.position, last_point.geom, last_point.index, last_point.position
  FROM (
         SELECT geom, index, position
         FROM ordered_points
         ORDER BY position
         LIMIT 1
       ) AS first_point,
       (
         SELECT geom, index, position
         FROM ordered_points
         ORDER BY position DESC
         LIMIT 1
       ) AS last_point
  INTO pickup, start_index, start_position, deposit, end_index, end_position;

  if start_index > end_index then
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

