using Liane.Api.Trip;
using MongoDB.Bson;

namespace Liane.Service.Internal.Trip
{
    public sealed record UserTrip(
        ObjectId? _id,
        string UserId,
        RealTrip Trip
    );
}