namespace Liane.Api.Trip
{
    public sealed record TripFilter(
        RallyingPoint? From,
        RallyingPoint? To,
        long? TimestampFrom,
        long? TimestampTo,
        bool WithHour
    );
}