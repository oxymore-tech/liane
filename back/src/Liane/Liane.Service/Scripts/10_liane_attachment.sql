TRUNCATE liane_member;

ALTER TABLE liane_message
  DROP CONSTRAINT liane_message_liane_id_fkey;

UPDATE liane_message m SET liane_id = lm.liane_request_id
FROM liane_member lm WHERE lm.liane_id = m.liane_id;

DELETE FROM liane_message WHERE liane_id NOT IN (SELECT id FROM liane_request);

ALTER TABLE liane_message
  ADD CONSTRAINT liane_message_liane_id_fkey FOREIGN KEY (liane_id) REFERENCES liane_request (id);

ALTER TABLE liane_member
  DROP COLUMN user_id,
  ALTER COLUMN joined_at DROP NOT NULL,
  DROP CONSTRAINT liane_member_liane_id_fkey,
  ADD COLUMN requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD CONSTRAINT liane_member_pkey PRIMARY KEY (liane_request_id),
  ADD CONSTRAINT liane_member_liane_id_fkey FOREIGN KEY (liane_id) REFERENCES liane_request (id);

DROP TABLE liane;