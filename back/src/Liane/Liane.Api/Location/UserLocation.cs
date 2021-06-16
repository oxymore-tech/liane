using System;
using Liane.Api.Routing;

namespace Liane.Api.Location
{
    public sealed record UserLocation(
        long Timestamp,
        double Latitude,
        double Longitude,
        double? Accuracy,
        float? Speed,
        String PermissionLevel,
        bool IsApple,
        bool Foreground
    )
    {
        public LatLng ToLatLng() => new(Latitude, Longitude);
    }
}