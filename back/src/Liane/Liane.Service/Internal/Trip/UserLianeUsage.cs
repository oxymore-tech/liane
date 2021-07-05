using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Liane.Service.Internal.Trip
{
    public sealed record UserLianeUsage(
        string User,
        bool IsPrimary,
        long Timestamp,
        ObjectId TripId
    );
}