namespace Liane.Api.Location
{
    public sealed record UserLocation(long Timestamp, double Latitude, double Longitude, double? Accuracy, float? Speed);
}