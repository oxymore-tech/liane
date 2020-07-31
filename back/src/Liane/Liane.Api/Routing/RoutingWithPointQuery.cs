using System.Collections.Immutable;

namespace Liane.Api.Routing
{
    public sealed class RoutingWithPointQuery
    {
        public RoutingWithPointQuery(LatLng start, LatLng end, LatLng point, float duration = -1, float distance = -1, ImmutableList<LatLng>? coordinates = null)
        {
            Start = start;
            End = end;
            Point = point;
            Duration = duration;
            Distance = distance;
            Coordinates = coordinates ?? ImmutableList.Create<LatLng>();
        }

        public LatLng Start { get; }
        public LatLng End { get; }
        public LatLng Point { get; }
        public float Distance { get; }
        public float Duration { get; }
        public ImmutableList<LatLng> Coordinates { get; }
    }
}