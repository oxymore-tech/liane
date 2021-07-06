using Liane.Api.Routing;

namespace Liane.Api
{
    public sealed record RallyingPoint(
        string Id,
        LatLng Position,
        string Label,
        double? Distance = null
    );
}