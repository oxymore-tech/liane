CREATE TABLE notification
(
  id         UUID PRIMARY KEY NOT NULL,
  created_by VARCHAR(24),
  title      VARCHAR(255)     NOT NULL,
  message    TEXT             NOT NULL,
  uri        VARCHAR(255),
  created_at TIMESTAMP        NOT NULL
);

CREATE TABLE recipient
(
  notification_id UUID        NOT NULL,
  user_id         VARCHAR(24) NOT NULL,
  read_at         TIMESTAMP,
  PRIMARY KEY (notification_id, user_id),
  FOREIGN KEY (notification_id) REFERENCES notification (id)
);