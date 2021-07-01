using System.Collections.Generic;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Liane.Service.Internal.Trip
{
    public sealed record LianeTrip(
        [property:BsonId] ObjectId Id,
        string User,
        List<ObjectId> LianeUsages
    );
}