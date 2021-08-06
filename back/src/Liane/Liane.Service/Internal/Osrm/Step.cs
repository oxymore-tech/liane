using System.Collections.Immutable;
using Liane.Api.Util;

namespace Liane.Service.Internal.Osrm
{
    // TODO: comment explaining Step object
    public sealed class Step
    {
        public Step(float distance, float duration, Geojson geometry, float weight, string name, ImmutableList<Intersection> intersections, string? @ref, string? pronunciation, string? destinations,
            string? exits, string? mode, Maneuver? maneuver, string? rotaryName, string? rotaryPronunciation, string? drivingSide)
        {
            Distance = distance;
            Duration = duration;
            Geometry = geometry;
            Weight = weight;
            Name = name;
            Intersections = intersections;
            Ref = @ref;
            Pronunciation = pronunciation;
            Destinations = destinations;
            Exits = exits;
            Mode = mode;
            Maneuver = maneuver;
            RotaryName = rotaryName;
            RotaryPronunciation = rotaryPronunciation;
            DrivingSide = drivingSide;
        }

        // The distance of travel from the maneuver to the subsequent step, in float meters.
        public float Distance { get; }

        // The estimated travel time, in float number of seconds.
        public float Duration { get; }

        // The unsimplified geometry of the route segment, depending on the geometries parameter.
        public Geojson Geometry { get; }

        // The calculated weight of the step.
        public float Weight { get; }

        // The name of the way along which travel proceeds.
        public string Name { get; }

        // A list of Intersection objects that are passed along the segment,
        // the very first belonging to the StepManeuver
        public ImmutableList<Intersection> Intersections { get; }

        // A reference number or code for the way. Optionally included, if ref data is available for the given way.
        public string? Ref { get; }

        // A string containing an IPA phonetic transcription indicating how to pronounce the name in the name property.
        // This property is omitted if pronunciation data is unavailable for the step.
        public string? Pronunciation { get; }

        // The destinations of the way. Will be undefined if there are no destinations.
        public string? Destinations { get; }

        // The exit numbers or names of the way. Will be undefined if there are no exit numbers or names.
        public string? Exits { get; }

        // A string signifying the mode of transportation.
        public string? Mode { get; }

        // A StepManeuver object representing the maneuver.
        public Maneuver? Maneuver { get; }

        // The name for the rotary. Optionally included, if the step is a rotary and a rotary name is available.
        public string? RotaryName { get; }

        // The pronunciation hint of the rotary name. Optionally included, if the step is a rotary and a rotary pronunciation is available.
        public string? RotaryPronunciation { get; }

        // The legal driving side at the location for this step. Either left or right.
        public string? DrivingSide { get; }

        public override string ToString()
        {
            return StringUtils.ToString(this);
        }
    }
}