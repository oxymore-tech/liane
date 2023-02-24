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

public sealed record DriverData
(
  Ref<Api.User.User> User,
  bool CanDrive = true
);

public sealed record LianeDb(
  //[property: BsonSerializer(typeof(String2ObjectIdBsonSerializer))]
  string Id,
  string? CreatedBy,
  DateTime CreatedAt,
  DateTime DepartureTime,
  DateTime? ReturnTime,
  ImmutableList<LianeMember> Members,
  DriverData DriverData, // The current or default driver
  Ref<ConversationGroup>? Conversation = null,
  GeoJsonPolygon<GeoJson2DGeographicCoordinates>? Geometry = null
) : IIdentity, ISharedResource<LianeMember>
{
  [BsonElement]
  public int TotalSeatCount => Members.Aggregate(0, (sum,v) => sum + v.SeatCount);
}
