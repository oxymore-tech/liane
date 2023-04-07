using System;
using System.Collections.Immutable;
using System.Linq;
using Liane.Api.Chat;
using Liane.Api.Trip;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver.GeoJsonObjectModel;

namespace Liane.Service.Internal.Trip;

public sealed record LianeDb(
  string Id,
  Ref<Api.User.User>? CreatedBy,
  DateTime CreatedAt,
  DateTime DepartureTime,
  DateTime? ReturnTime,
  ImmutableList<LianeMember> Members,
  Driver Driver,
  LianeStatus Status,
  Ref<ConversationGroup>? Conversation = null,
  GeoJsonLineString<GeoJson2DGeographicCoordinates>? Geometry = null
) : IIdentity, ISharedResource<LianeMember>
{
  [BsonElement] public int TotalSeatCount => Members.Aggregate(0, (sum, v) => sum + v.SeatCount);
}