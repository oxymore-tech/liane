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
  int? Delay = null, // TimeInSeconds
  Feedback? Feedback = null,
  bool? TakesReturnTrip = null  //TODO remove when migration ok
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
  Ref<Liane>? Return,
  ImmutableList<WayPoint> WayPoints,
  ImmutableList<LianeMember> Members,
  Driver Driver,
  LianeState State,
  Ref<ConversationGroup>? Conversation
) : IEntity, ISharedResource<LianeMember>;
