using System.Collections.Generic;
using System.Linq;
using Liane.Api.Routing;
using Liane.Api.Rp;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver.GeoJsonObjectModel;

namespace Liane.Service.Internal.Trip
{
    public sealed record UsedLiane(
        [property: BsonId] ObjectId Id,
        RallyingPoint From,
        RallyingPoint To,
        GeoJsonPoint<GeoJson2DGeographicCoordinates> Location,
        List<UserLianeUsage> Usages
    )
    {
        public UsedLiane(ObjectId id, RallyingPoint from, RallyingPoint to, List<UserLianeUsage> usages)
            : this(
                id,
                from,
                to,
                GeoJson.Point(new GeoJson2DGeographicCoordinates(from.Coordinates.Lng, from.Coordinates.Lat)),
                usages
            ) {}

        public Api.Trip.Liane ToLiane()
        {
            return new Api.Trip.Liane(From, To, Usages.Select(u => u.ToLianeUsage()).ToList());
        }
    }
}