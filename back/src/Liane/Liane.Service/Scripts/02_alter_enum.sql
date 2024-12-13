UPDATE rallying_point
SET type = CASE type
             WHEN '0' THEN 'Parking'
             WHEN '1' THEN 'CarpoolArea'
             WHEN '2' THEN 'Supermarket'
             WHEN '3' THEN 'HighwayExit'
             WHEN '4' THEN 'RelayParking'
             WHEN '5' THEN 'AbandonedRoad'
             WHEN '6' THEN 'AutoStop'
             WHEN '7' THEN 'TownHall'
             ELSE 'CarpoolArea'
  END;