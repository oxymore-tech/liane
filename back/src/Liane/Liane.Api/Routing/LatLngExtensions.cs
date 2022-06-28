using System.Collections.Immutable;
using System.Linq;

namespace Liane.Api.Routing;

public static class LatLngExtensions
{
    public static ImmutableList<LatLng> ToLatLng(this ImmutableList<LngLatTuple> coordinates) => coordinates.Select(c => c.ToLatLng()).ToImmutableList();

    public static ImmutableList<LngLatTuple> ToLngLatTuple(this ImmutableList<LatLng> coordinates) => coordinates.Select(c => c.ToLngLatTuple()).ToImmutableList();
}