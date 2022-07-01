using System.Collections.Immutable;
using Liane.Api.Routing;

namespace Liane.Service.Internal.Osrm;

public sealed class Geojson
{
    public Geojson(string type, ImmutableList<LngLatTuple> coordinates)
    {
        Type = type;
        Coordinates = coordinates;
    }

    public string Type { get; }
    public ImmutableList<LngLatTuple> Coordinates { get; }
}