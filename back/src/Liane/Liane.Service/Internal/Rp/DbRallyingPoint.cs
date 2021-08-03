using Liane.Api.Routing;
using Liane.Api.Rp;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Liane.Service.Internal.Rp
{
    /**
     * Represent the data structure of a rallying point in mongo.
     */
    public sealed record DbRallyingPoint(
        [property: BsonId] ObjectId Id,
        string Label,
        double[] Coordinates,
        string Type = "point",
        bool IsActive = true
    )
    {
        public DbRallyingPoint(ObjectId id, string label, LatLng coordinates, string type = "point", bool isActive = true) 
            : this(id, label, new[] {coordinates.Lng, coordinates.Lat}, type, isActive) {}

        public RallyingPoint ToRallyingPoint()
        {
            return new RallyingPoint(Id.ToString(), Label, new LatLng(Coordinates[1], Coordinates[0]), Type, IsActive);
        }
    }
}