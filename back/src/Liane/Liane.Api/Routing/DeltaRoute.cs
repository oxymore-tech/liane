using System;
using System.Collections.Immutable;

namespace Liane.Api.Routing;

using LngLatTuple = Tuple<double, double>;

public sealed record DeltaRoute(
  ImmutableList<LngLatTuple> Coordinates,
  float Duration,
  float Distance,
  float Delta
);