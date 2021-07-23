using Liane.Api.Routing;

namespace Liane.Api.Trip
{
    public sealed record RawTripFilter(
        LatLng Center,
        string? User,
        long? TimeInterval,
        long? DistInterval,
        bool? WithForeground,
        bool? WithBackGround
    );
}