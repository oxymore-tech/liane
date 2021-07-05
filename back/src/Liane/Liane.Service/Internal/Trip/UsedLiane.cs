using System.Collections.Generic;
using Liane.Api;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Liane.Service.Internal.Trip
{
    public sealed record UsedLiane(
        [property:BsonId] ObjectId Id,
        RallyingPoint From,
        RallyingPoint To,
        List<UserLianeUsage> Usages
    );
}