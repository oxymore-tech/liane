using System.Collections.Immutable;
using Liane.Api.Util;

namespace Liane.Api.Object
{
    public sealed class Route
    {
        // The distance traveled by the route, in float meters.
        public Route(float distance, float duration, float weight, string weightName, Geojson geometry, ImmutableList<Leg> legs)
        {
            Distance = distance;
            Duration = duration;
            Weight = weight;
            Weight_name = weightName;
            Geometry = geometry;
            Legs = legs;
        }

        public float Distance { get; }
        // The estimated travel time, in float number of seconds.
        public float Duration { get; }
        // The calculated weight of the route.
        public float Weight { get; }
        // The name of the weight profile used during extraction phase.
        public string Weight_name { get; }
        
        // The whole geometry of the route value depending on overview parameter,
        // format depending on the geometries parameter
        // Either a polyline or a GeoJSON LineString,
        public Geojson Geometry { get; }
        
        // The legs between the given waypoints, an array of RouteLeg objects.
        public ImmutableList<Leg> Legs { get; }

        public override string ToString()
        {
            return StringUtils.ToString(this);
        }
    }
}