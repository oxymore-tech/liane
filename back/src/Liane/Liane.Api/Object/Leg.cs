using System.Collections.Immutable;

namespace Liane.Api.Object
{
    // Represents a route between two waypoints.
    public sealed class Leg
    {
        // The distance traveled by this route leg, in float meters.
        public Leg(float distance, float duration, ImmutableList<Step> steps, float? weight, Annotation? annotation)
        {
            Distance = distance;
            Duration = duration;
            Steps = steps;
            Weight = weight;
            Annotation = annotation;
        }

        public float Distance { get; }
        // The estimated travel time, in float number of seconds.
        public float Duration { get; }
        // Depends on the steps parameter :
        // if true then array of RouteStep objects describing
        // the turn-by-turn instructions
        public ImmutableList<Step> Steps { get; }

        // The calculated weight of the route leg.
        public float ?Weight { get; }
        // Additional details about each coordinate along the route geometry.
        public Annotation ?Annotation { get; }
        
    }
}