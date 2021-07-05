using System.Collections.Generic;

namespace Liane.Api.Trip
{
    public sealed record Liane(
        RallyingPoint From,
        RallyingPoint To,
        List<LianeUsage> Usages
    );
}