using System.Collections.Generic;

namespace Liane.Api.Trip;

public sealed record Liane(
    RallyingPoint.RallyingPoint From,
    RallyingPoint.RallyingPoint To,
    List<LianeUsage> Usages
);