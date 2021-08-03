using Liane.Api.Routing;
using Liane.Api.Rp;

namespace Liane.Api.Trip
{
    public sealed record RoutedLiane(
        RallyingPoint2 From,
        RallyingPoint2 To,
        int NumberOfUsages,
        bool IsPrimary,
        Route Route
    );
}