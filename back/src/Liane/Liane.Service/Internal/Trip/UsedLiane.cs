using System.Collections.Generic;
using System.Linq;
using Liane.Api.Routing;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver.GeoJsonObjectModel;

namespace Liane.Service.Internal.Trip;

public sealed record UsedLiane(
    [property: BsonId] ObjectId Id,
    Api.RallyingPoint.RallyingPoint From,
    Api.RallyingPoint.RallyingPoint To,
    GeoJsonPoint<GeoJson2DGeographicCoordinates> Location,
    List<UserLianeUsage> Usages
)
{
    public UsedLiane(ObjectId id, Api.RallyingPoint.RallyingPoint from, Api.RallyingPoint.RallyingPoint to, List<UserLianeUsage> usages)
        : this(
            id,
            from,
            to,
            GeoJson.Point(new GeoJson2DGeographicCoordinates(from.Location.Lng, from.Location.Lat)),
            usages
        )
    {
    }

    public Api.Trip.Liane ToLiane()
    {
        return new Api.Trip.Liane(From, To, Usages.Select(u => u.ToLianeUsage()).ToList());
    }
}