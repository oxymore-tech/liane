using System.Collections.Immutable;
using Liane.Api.Location;
using MongoDB.Bson;

namespace Liane.Service.Internal.Trip
{
    public sealed record UserRawTrip(
        ObjectId? _id,
        string UserId,
        ImmutableList<UserLocation> Locations
    );
}