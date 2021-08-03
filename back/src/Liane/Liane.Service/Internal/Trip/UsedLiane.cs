using System.Collections.Generic;
using System.Linq;
using Liane.Api;
using Liane.Api.Rp;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Liane.Service.Internal.Trip
{
    public sealed record UsedLiane(
        [property: BsonId] ObjectId Id,
        RallyingPoint2 From,
        RallyingPoint2 To,
        List<UserLianeUsage> Usages
    )
    {
        public Api.Trip.Liane ToLiane()
        {
            return new (From, To, Usages.Select(u => u.ToLianeUsage()).ToList());
        }
    }
}