using System.Collections.Generic;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Liane.Service.Internal.Trip
{
    public sealed record UserLianeTrip(
        [property:BsonId] ObjectId Id,
        string User,
        long Timestamp,
        List<ObjectId> Lianes
    );
}