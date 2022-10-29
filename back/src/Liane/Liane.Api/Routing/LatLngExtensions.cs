using System.Collections.Immutable;
using System.Linq;
using LngLatTuple = System.Tuple<double, double>;

namespace Liane.Api.Routing;

public static class LatLngExtensions
{
    public static ImmutableList<LatLng> ToLatLng(this ImmutableList<LngLatTuple> coordinates) => coordinates.Select(t => (LatLng)t).ToImmutableList();

    public static ImmutableList<LngLatTuple> ToLngLatTuple(this ImmutableList<LatLng> coordinates) => coordinates.Select(t => (LngLatTuple)t).ToImmutableList();
}