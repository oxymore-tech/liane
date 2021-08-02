using Liane.Api.Routing;

namespace Liane.Api.Rp
{
    public sealed record RallyingPoint(
        string Id,
        LatLng Position,
        string Label,
        double? Distance = null
    );
}