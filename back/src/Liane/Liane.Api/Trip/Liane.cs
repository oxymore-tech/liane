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

public enum PassengerState
{
  Moving,
  Stationary
}

public sealed record PassengerStatus(PassengerState State, DateTime NextEta);

public sealed record NextEta(Ref<RallyingPoint> RallyingPoint, DateTime Eta);

public sealed record LianeStatus(
  DateTime At,
  LianeState State,
  NextEta? NextEta,
  ImmutableHashSet<Ref<User.User>> Carpoolers,
  ImmutableDictionary<Ref<User.User>, PassengerStatus> NextPassengers
);

public sealed record LianeMember(
  Ref<User.User> User,
  Ref<RallyingPoint> From,
  Ref<RallyingPoint> To,
  bool? TakesReturnTrip = null,
  int SeatCount = -1 // Defaults to a passenger seat
) : IResourceMember;

public sealed record Driver
(
  Ref<User.User> User,
  bool CanDrive = true
);

public sealed record Liane(
  string Id,
  Ref<User.User> CreatedBy,
  DateTime? CreatedAt,
  DateTime DepartureTime,
  DateTime? ReturnTime,
  ImmutableSortedSet<WayPoint> WayPoints,
  ImmutableList<LianeMember> Members,
  Driver Driver,
  LianeState State,
  Ref<ConversationGroup>? Conversation
) : IEntity, ISharedResource<LianeMember>;