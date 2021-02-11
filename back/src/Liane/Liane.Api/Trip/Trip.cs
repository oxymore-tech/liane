

using System.Collections.Immutable;
using Liane.Api.Routing;

namespace Liane.Api.Trip
{
    public sealed record Trip(ImmutableList<LatLng> coordinates);
}