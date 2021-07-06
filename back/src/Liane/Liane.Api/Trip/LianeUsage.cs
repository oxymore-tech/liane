namespace Liane.Api.Trip
{
    public sealed record LianeUsage(
        long Timestamp,
        bool IsPrimary,
        string TripId
    );
}