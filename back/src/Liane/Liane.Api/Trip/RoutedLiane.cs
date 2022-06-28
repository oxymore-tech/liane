using Liane.Api.Routing;

namespace Liane.Api.Trip;

public sealed record RoutedLiane(
    RallyingPoint.RallyingPoint From,
    RallyingPoint.RallyingPoint To,
    int NumberOfUsages,
    bool IsPrimary,
    Route Route
);