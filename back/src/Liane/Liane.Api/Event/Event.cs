using System;
using System.Collections.Immutable;
using Liane.Api.Util.Ref;

namespace Liane.Api.Event;

public sealed record Event(
  string? Id,
  ImmutableList<Recipient> Recipients,
  Ref<User.User> CreatedBy,
  DateTime? CreatedAt,
  bool NeedsAnswer,
  Ref<Trip.Liane> Liane,
  LianeEvent LianeEvent
) : IEntity;

public sealed record Recipient(
  Ref<User.User> User,
  DateTime? SeenAt
);