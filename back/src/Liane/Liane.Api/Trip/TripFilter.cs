using Liane.Api.Routing;

namespace Liane.Api.Trip
{
    public sealed record TripFilter(
        LatLng Center,
        RallyingPoint? From,
        RallyingPoint? To,
        int? dayFrom,
        int? dayTo,
        int? hourFrom,
        int? hourTo
    );
}