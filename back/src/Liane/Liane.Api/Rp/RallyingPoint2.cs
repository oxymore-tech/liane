using Liane.Api.Routing;

namespace Liane.Api.Rp
{
    public sealed record RallyingPoint2(
        string Label,
        double[] Coordinates,
        string Type = "point",
        bool IsActive = true
    )
    {
        public RallyingPoint2(string label, LatLng coordinates, string type = "point", bool isActive = true) 
            : this(label, new[] {coordinates.Lng, coordinates.Lat}, type, isActive) {}
    }
}