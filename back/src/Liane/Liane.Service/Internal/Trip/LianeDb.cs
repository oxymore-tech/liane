using System;
using System.Collections.Immutable;
using System.Linq;
using Liane.Api.Chat;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;
using MongoDB.Bson.Serialization.Attributes;

namespace Liane.Service.Internal.Trip;

public sealed record UserPing(
  Ref<Api.User.User> User,
  DateTime At,
  TimeSpan Delay,
  LatLng? Coordinate
);

public sealed record WayPointDb(Ref<RallyingPoint> RallyingPoint, int Duration, int Distance, DateTime Eta);

public sealed record LianeDb(
  string Id,
  Ref<Api.User.User>? CreatedBy,
  DateTime? CreatedAt,
  DateTime DepartureTime,
  Ref<Api.Trip.Trip>? Return,
  ImmutableList<LianeMember> Members,
  Driver Driver,
  LianeState State,
  ImmutableList<WayPointDb> WayPoints,
  ImmutableList<UserPing> Pings,
  Ref<ConversationGroup>? Conversation,
  Ref<LianeRecurrence>? Recurrence = null
) : IEntity<string>, ISharedResource<LianeMember>
{
  [BsonElement] public int TotalSeatCount => Members.Aggregate(0, (sum, v) => sum + v.SeatCount);
}
