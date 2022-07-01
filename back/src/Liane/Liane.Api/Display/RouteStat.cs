
using System.Collections.Immutable;
using Liane.Api.Routing;

namespace Liane.Api.Display;

public sealed record RouteStat(ImmutableList<LatLng> Coordinates, int Stat);