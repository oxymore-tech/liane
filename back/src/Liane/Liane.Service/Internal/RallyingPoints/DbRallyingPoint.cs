using System;
using System.Collections.Generic;
using Liane.Api.RallyingPoints;
using Liane.Api.Routing;
using Liane.Api.Trip;
using MongoDB.Bson;
using MongoDB.Driver.GeoJsonObjectModel;

namespace Liane.Service.Internal.RallyingPoints;

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
        )
    {
    }

    public DbRallyingPoint(ObjectId id, string label, LatLng pos, bool isActive = true)
        : this(
            id,
            label,
            GeoJson.Point(new GeoJson2DGeographicCoordinates(pos.Lng, pos.Lat)),
            isActive
        )
    {
    }

    public RallyingPoint ToRallyingPoint()
    {
        return new RallyingPoint(Id.ToString(), Label, new LatLng(Location.Coordinates.Latitude, Location.Coordinates.Longitude), IsActive);
    }
    
    public bool Equals(DbRallyingPoint? other)
    {
        if (ReferenceEquals(other, null)) return false;
        if (ReferenceEquals(other, this)) return true;
        return Id == other.Id;
    }   
    
    public override int GetHashCode()
    {
        return Id.GetHashCode();
    }
}