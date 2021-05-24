using Liane.Api.Routing;

namespace Liane.Api.Location
{
    public sealed record UserLocation(long Timestamp, double Latitude, double Longitude, double? Accuracy, float? Speed)
    {
        public LatLng ToLatLng() => new(Latitude, Longitude);
    }
}