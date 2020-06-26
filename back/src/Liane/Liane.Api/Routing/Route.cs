using System.Collections.Immutable;

namespace Liane.Api.Routing
{
    public sealed class Route
    {
        public Route(ImmutableList<LatLng> coordinates, float duration, float distance)
        {
            Coordinates = coordinates;
            Duration = duration;
            Distance = distance;
        }

        public ImmutableList<LatLng> Coordinates { get; }
        public float Duration { get; }
        public float Distance { get; }
    }
}