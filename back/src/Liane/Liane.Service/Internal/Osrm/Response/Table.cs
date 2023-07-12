using System.Collections.Immutable;

namespace Liane.Service.Internal.Osrm.Response;

public sealed record Table(
  ImmutableArray<ImmutableArray<double?>> Durations,
  ImmutableArray<ImmutableArray<double?>> Distances
);