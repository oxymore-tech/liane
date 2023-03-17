using System;
using Liane.Api.Util.Ref;

namespace Liane.Api.Event;

public sealed record Notification(
  string Title,
  string Message,
  UserEvent? Payload
);

public sealed record UserEvent(
  string Id,
  User.User CreatedBy,
  DateTime CreatedAt,
  bool Seen,
  bool NeedsAnswer,
  LianeEvent LianeEvent
);