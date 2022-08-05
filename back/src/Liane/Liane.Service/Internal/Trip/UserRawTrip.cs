using System.Collections.Generic;
using Liane.Api.Location;
using MongoDB.Bson;

namespace Liane.Service.Internal.Trip;

public sealed record UserRawTrip(
    ObjectId? Id,
    string UserId,
    List<UserLocation> Locations
);