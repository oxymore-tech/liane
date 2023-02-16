using System;
using System.Collections.Immutable;
using Liane.Api.Trip;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo.Serialization;
using MongoDB.Bson.Serialization.Attributes;

namespace Liane.Service.Internal.Trip;

public sealed record DriverData
(
  Ref<Api.User.User> User,
  bool CanDrive = true
);

public sealed record LianeDb(
   [property:BsonSerializer(typeof(String2ObjectIdBsonSerializer))]
    string Id,
    string? CreatedBy,
    DateTime CreatedAt,
    DateTime DepartureTime,
    DateTime? ReturnTime,
    ImmutableList<LianeMember> Members,
    DriverData DriverData  // The current or default driver
): IIdentity, ISharedResource<LianeMember>;