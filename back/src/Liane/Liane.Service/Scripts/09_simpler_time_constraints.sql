
DROP TABLE IF EXISTS time_constraint ;

ALTER TABLE liane_request
  ADD COLUMN arrive_before TIME NOT NULL DEFAULT '09:00:00',
  ADD COLUMN return_after TIME NOT NULL DEFAULT '18:00:00';