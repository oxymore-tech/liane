namespace Liane.Api.Trip
{
    public sealed record LianeUsage(
        string User,
        long Timestamp,
        bool IsPrimary,
        string TripId
    );
}