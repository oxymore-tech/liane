using Liane.Api.Routing;

namespace Liane.Api.Util
{
    public sealed record RallyingPoint2(
        string Id,
        string Label,
        double[] Coordinates,
        string Type = "point",
        bool IsActive = true
    )
    {
        public RallyingPoint2(string id, string label, LatLng coordinates, string type = "point", bool isActive = true) 
            : this(id, label, new[] {coordinates.Lat, coordinates.Lng}, type, isActive) {}
    }
}