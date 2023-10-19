using System;
using System.Collections.Immutable;
using Liane.Api.Chat;
using Liane.Api.Routing;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public enum LianeState
{
  NotStarted,
  Started,
  Finished, // en theorie tout le monde est arrivée
  Archived, // on a eu une confirmation que le trajet ce soit bien passé
  Canceled
}

public enum GeolocationLevel
{
  None,
  Hidden,
  Shared
}
public sealed record Feedback(
  bool Canceled = false,
  string? Comment = null
);

public sealed record LianeMember(
  [property:SerializeAsResolvedRef]
  Ref<User.User> User,
  Ref<RallyingPoint> From,
  Ref<RallyingPoint> To,
  int SeatCount = -1, // Defaults to a passenger seat
  Feedback? Feedback = null,
  GeolocationLevel? GeolocationLevel = GeolocationLevel.None
) : IResourceMember;

public sealed record Driver
(
  Ref<User.User> User,
  bool CanDrive = true
);

public sealed record Recurrence
  (Ref<LianeRecurrence> Id,  DayOfTheWeekFlag Days);

public sealed record Liane(
  string Id,
  Ref<User.User> CreatedBy,
  DateTime? CreatedAt,
  DateTime DepartureTime,
  Ref<Liane>? Return,
  ImmutableList<WayPoint> WayPoints,
  ImmutableList<LianeMember> Members,
  Driver Driver,
  LianeState State,
  Ref<ConversationGroup>? Conversation,
  Recurrence? Recurrence = null
) : IEntity, ISharedResource<LianeMember>;
