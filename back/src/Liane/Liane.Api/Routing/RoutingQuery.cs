using System.Collections.Immutable;
using System.Text.Json.Serialization;

namespace Liane.Api.Routing;

public sealed class RoutingQuery
{

    public RoutingQuery(LatLng start, LatLng end)
    {
        Coordinates = ImmutableList.Create(start, end);
    }

    [JsonConstructor]
    public RoutingQuery(ImmutableList<LatLng> coordinates)
    {
      Coordinates = coordinates;
    }

    public ImmutableList<LatLng> Coordinates { get; }

}
