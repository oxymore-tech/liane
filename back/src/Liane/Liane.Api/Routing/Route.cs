using Liane.Api.Osrm;

namespace Liane.Api.Routing
{
    public sealed class Route
    {
        public Route(Geojson geojson, float duration, float distance)
        {
            Geojson = geojson;
            Duration = duration;
            Distance = distance;
        }

        public Geojson Geojson { get; }
        public float Duration { get; }
        public float Distance { get; }
    }
}