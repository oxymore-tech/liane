using System.Collections.Generic;
using Liane.Api.Routing;

namespace Liane.Api.Trip
{
    public sealed record RoutedLiane(
        RallyingPoint From,
        RallyingPoint To,
        List<LianeUsage> Usages,
        Route Route
    );
}