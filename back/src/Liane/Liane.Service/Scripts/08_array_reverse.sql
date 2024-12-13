CREATE OR REPLACE FUNCTION array_reverse(anyarray) RETURNS anyarray AS $$
SELECT ARRAY(
         SELECT $1[i]
         FROM generate_series(
                array_lower($1,1),
                array_upper($1,1)
              ) AS s(i)
         ORDER BY i DESC
       );
$$ LANGUAGE 'sql' STRICT IMMUTABLE;