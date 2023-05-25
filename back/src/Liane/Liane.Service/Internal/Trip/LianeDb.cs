using System;
using System.Collections.Immutable;
using System.Linq;
using Liane.Api.Chat;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver.GeoJsonObjectModel;

namespace Liane.Service.Internal.Trip;

public sealed record UserPing(
  Ref<Api.User.User> User,
  DateTime At,
  TimeSpan Delay,
  LatLng? Coordinate
);

public sealed record LianeDb(
  string Id,
  Ref<Api.User.User>? CreatedBy,
  DateTime CreatedAt,
  DateTime DepartureTime,
  DateTime? ReturnTime,
  ImmutableList<LianeMember> Members,
  Driver Driver,
  LianeState State,
  ImmutableList<UserPing> Pings,
  GeoJsonLineString<GeoJson2DGeographicCoordinates>? Geometry,
  Ref<ConversationGroup>? Conversation
) : IIdentity, ISharedResource<LianeMember>
{
  [BsonElement] public int TotalSeatCount => Members.Aggregate(0, (sum, v) => sum + v.SeatCount);
}