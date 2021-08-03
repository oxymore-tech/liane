using System.Collections.Generic;
using Liane.Api.Rp;

namespace Liane.Api.Trip
{
    public sealed record Liane(
        RallyingPoint2 From,
        RallyingPoint2 To,
        List<LianeUsage> Usages
    );
}