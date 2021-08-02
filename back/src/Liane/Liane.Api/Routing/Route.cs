using System.Collections.Immutable;

namespace Liane.Api.Routing
{
    public sealed record Route(ImmutableList<LatLng> Coordinates, float Duration, float Distance);
}