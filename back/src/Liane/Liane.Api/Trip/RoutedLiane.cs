using Liane.Api.Routing;

namespace Liane.Api.Trip;

public sealed record RoutedLiane(
    RallyingPoints.RallyingPoint From,
    RallyingPoints.RallyingPoint To,
    int NumberOfUsages,
    bool IsPrimary,
    Route Route
);