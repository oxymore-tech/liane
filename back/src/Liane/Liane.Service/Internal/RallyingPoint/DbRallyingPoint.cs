using Liane.Api.Routing;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver.GeoJsonObjectModel;

namespace Liane.Service.Internal.RallyingPoint;

public sealed record DbRallyingPoint(
    ObjectId Id,
    string Label,
    GeoJsonPoint<GeoJson2DGeographicCoordinates> Location,
    bool IsActive = true
)
{
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

    public Api.RallyingPoint.RallyingPoint ToRallyingPoint()
    {
        return new Api.RallyingPoint.RallyingPoint(Id.ToString(), Label, new LatLng(Location.Coordinates.Latitude, Location.Coordinates.Longitude), IsActive);
    }
}