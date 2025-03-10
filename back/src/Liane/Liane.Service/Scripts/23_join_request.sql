CREATE TABLE join_request
(
  requester_id UUID                     NOT NULL,
  requestee_id UUID                     NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
  FOREIGN KEY (requester_id) REFERENCES liane_request (id),
  FOREIGN KEY (requestee_id) REFERENCES liane_request (id),
  PRIMARY KEY (requester_id)
);
