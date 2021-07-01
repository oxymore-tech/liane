using System.Collections.Generic;
using System.ComponentModel;
using Liane.Api;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Liane.Service.Internal.Trip
{
    public sealed record Liane(
        [property:BsonId] ObjectId Id,
        RallyingPoint From,
        RallyingPoint To,
        List<ObjectId> Usages
    );
}