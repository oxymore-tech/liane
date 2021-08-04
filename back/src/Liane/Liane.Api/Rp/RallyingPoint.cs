using Liane.Api.Routing;

namespace Liane.Api.Rp
{
    public sealed record RallyingPoint(
        string Id,
        string Label,
        LatLng Coordinates,
        bool IsActive = true
    );
}