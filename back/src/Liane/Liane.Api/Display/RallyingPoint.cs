using Liane.Api.Routing;

namespace Liane.Api.Display
{
    public sealed record RallyingPoint(string Id, LatLng Position, double? Distance = null);
}