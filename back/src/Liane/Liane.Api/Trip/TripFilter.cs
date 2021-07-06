using Liane.Api.Routing;

namespace Liane.Api.Trip
{
    public sealed record TripFilter(
        LatLng Center,
        RallyingPoint? From,
        RallyingPoint? To,
        long? TimestampFrom,
        long? TimestampTo,
        bool WithHour
    );
}