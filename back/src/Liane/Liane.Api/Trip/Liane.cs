using System.Collections.Generic;

namespace Liane.Api.Trip
{
    public sealed record Liane(
        RallyingPoint From,
        RallyingPoint To,
        bool IsPrimary,
        List<LianeUsage> Usages
    );
}