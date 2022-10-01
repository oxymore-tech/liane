using System.Collections.Immutable;
using Liane.Api.Routing;

namespace Liane.Service.Internal.Osrm;

public sealed record Geojson(
    string Type,
    ImmutableList<LngLatTuple> Coordinates
);