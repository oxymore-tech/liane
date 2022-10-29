using System;
using System.Collections.Immutable;

namespace Liane.Service.Internal.Osrm;

using LngLatTuple = Tuple<double, double>;

public sealed record Geojson(
    string Type,
    ImmutableList<LngLatTuple> Coordinates
);