using Liane.Api.Routing;
using Liane.Api.Rp;

namespace Liane.Api.Trip
{
    public sealed record RoutedLiane(
        RallyingPoint From,
        RallyingPoint To,
        int NumberOfUsages,
        bool IsPrimary,
        Route Route
    );
}