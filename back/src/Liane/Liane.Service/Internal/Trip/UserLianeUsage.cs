using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Liane.Service.Internal.Trip
{
    public sealed record UserLianeUsage(
        [property:BsonId] ObjectId Id,
        string User,
        long Timestamp,
        ObjectId Liane
    );
}