DROP TABLE liane_message;

CREATE TABLE liane_message
(
  id         UUID        NOT NULL,
  liane_id   UUID        NOT NULL,
  content    json        NOT NULL,
  created_by VARCHAR(24) NOT NULL,
  created_at TIMESTAMP   NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (liane_id) REFERENCES liane (id)
);