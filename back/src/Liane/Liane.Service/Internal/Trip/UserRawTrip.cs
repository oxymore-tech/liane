using System.Collections.Generic;
using Liane.Api.Location;
using MongoDB.Bson;

namespace Liane.Service.Internal.Trip
{
    public sealed record UserRawTrip(
        ObjectId? _id,
        string UserId,
        List<UserLocation> Locations
    );
}