using System.Collections.Generic;

namespace Liane.Api.Trip;

public sealed record Liane(
    RallyingPoints.RallyingPoint From,
    RallyingPoints.RallyingPoint To,
    List<LianeUsage> Usages
);