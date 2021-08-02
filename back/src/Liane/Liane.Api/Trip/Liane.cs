using System.Collections.Generic;
using Liane.Api.Rp;

namespace Liane.Api.Trip
{
    public sealed record Liane(
        RallyingPoint From,
        RallyingPoint To,
        List<LianeUsage> Usages
    );
}