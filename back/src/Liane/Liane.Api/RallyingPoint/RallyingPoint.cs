using Liane.Api.Routing;

namespace Liane.Api.RallyingPoint;

public sealed record RallyingPoint(
    string? Id,
    string Label,
    LatLng Location,
    bool IsActive
);