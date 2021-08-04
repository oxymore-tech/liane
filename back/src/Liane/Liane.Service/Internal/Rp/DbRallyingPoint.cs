using Liane.Api.Routing;
using Liane.Api.Rp;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver.GeoJsonObjectModel;

namespace Liane.Service.Internal.Rp
{
    /**
     * Represent the data structure of a rallying point in Mongo.
     */
    public sealed record DbRallyingPoint(
        [property: BsonId] ObjectId Id,
        string Label,
        GeoJsonPoint<GeoJson2DGeographicCoordinates> Location,
        bool IsActive = true
    )
    {
        public const string CoordinatesName = "Location";
        
        public DbRallyingPoint(ObjectId id, string label, double lat, double lng, bool isActive = true) 
            : this(
                id, 
                label, 
                GeoJson.Point(new GeoJson2DGeographicCoordinates(lng, lat)),
                isActive
            ) {}
        
        public DbRallyingPoint(ObjectId id, string label, LatLng pos, bool isActive = true) 
            : this(
                id, 
                label, 
                GeoJson.Point(new GeoJson2DGeographicCoordinates(pos.Lng, pos.Lat)),
                isActive
            ) {}

        public RallyingPoint ToRallyingPoint()
        {
            return new (Id.ToString(), Label, new LatLng(Location.Coordinates.Latitude, Location.Coordinates.Latitude), IsActive);
        }
    }
}