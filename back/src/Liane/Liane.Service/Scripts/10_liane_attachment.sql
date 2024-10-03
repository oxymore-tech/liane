TRUNCATE liane_member;

ALTER TABLE liane_message
  DROP CONSTRAINT liane_message_liane_id_fkey,
  ADD CONSTRAINT liane_message_liane_id_fkey FOREIGN KEY (liane_id) REFERENCES liane_request (id);

ALTER TABLE liane_member
  DROP COLUMN user_id,
  ALTER COLUMN joined_at DROP NOT NULL,
  DROP CONSTRAINT liane_member_liane_id_fkey,
  ADD COLUMN requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD CONSTRAINT liane_member_pkey PRIMARY KEY (liane_request_id),
  ADD CONSTRAINT liane_member_liane_id_fkey FOREIGN KEY (liane_id) REFERENCES liane_request (id);

DROP TABLE liane;