using Liane.Api.Routing;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public sealed record RallyingPoint(
    string? Id,
    string Label,
    LatLng Location,
    bool IsActive
) : IIdentity;