using System;
using System.Collections.Immutable;
using Liane.Api.Chat;
using Liane.Api.Routing;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public enum TripState
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

public sealed record TripMember(
  [property:SerializeAsResolvedRef]
  Ref<Auth.User> User,
  Ref<RallyingPoint> From,
  Ref<RallyingPoint> To,
  int SeatCount = -1, // Defaults to a passenger seat
  Feedback? Feedback = null,
  GeolocationLevel GeolocationLevel = GeolocationLevel.None,
  DateTime? Departure = null,
  DateTime? Cancellation = null
) : IResourceMember;

public sealed record Driver
(
  Ref<Auth.User> User,
  bool CanDrive = true
);

public sealed record Recurrence
  (Ref<TripRecurrence> Id,  DayOfWeekFlag Days);

public sealed record Trip(
  string Id,
  Ref<Auth.User> CreatedBy,
  DateTime? CreatedAt,
  DateTime DepartureTime,
  Ref<Trip>? Return,
  ImmutableList<WayPoint> WayPoints,
  ImmutableList<TripMember> Members,
  Driver Driver,
  TripState State,
  Ref<ConversationGroup>? Conversation,
  Recurrence? Recurrence = null
) : IEntity<string>, ISharedResource<TripMember>;
