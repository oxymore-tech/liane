using System.Collections.Immutable;

namespace Liane.Service.Internal.Osrm;

/// <summary>
/// 
/// </summary>
/// <param name="Distance">The distance of travel from the maneuver to the subsequent step, in float meters.</param>
/// <param name="Duration">The estimated travel time, in float number of seconds.</param>
/// <param name="Geometry">The unsimplified geometry of the route segment, depending on the geometries parameter.</param>
/// <param name="Weight">The calculated weight of the step.</param>
/// <param name="Name">The name of the way along which travel proceeds.</param>
/// <param name="Intersections">A list of Intersection objects that are passed along the segment, the very first belonging to the StepManeuver</param>
/// <param name="Ref">A reference number or code for the way. Optionally included, if ref data is available for the given way.</param>
/// <param name="Pronunciation">A string containing an IPA phonetic transcription indicating how to pronounce the name in the name property. This property is omitted if pronunciation data is unavailable for the step.</param>
/// <param name="Destinations">The destinations of the way. Will be undefined if there are no destinations.</param>
/// <param name="Exits">The exit numbers or names of the way. Will be undefined if there are no exit numbers or names.</param>
/// <param name="Mode">A string signifying the mode of transportation.</param>
/// <param name="Maneuver">A StepManeuver object representing the maneuver.</param>
/// <param name="RotaryName">The name for the rotary. Optionally included, if the step is a rotary and a rotary name is available.</param>
/// <param name="RotaryPronunciation">The pronunciation hint of the rotary name. Optionally included, if the step is a rotary and a rotary pronunciation is available.</param>
/// <param name="DrivingSide">The legal driving side at the location for this step. Either left or right.</param>
public sealed record Step(
    float Distance,
    float Duration,
    Geojson Geometry,
    float Weight,
    string Name,
    ImmutableList<Intersection> Intersections,
    string? Ref,
    string? Pronunciation,
    string? Destinations,
    string? Exits,
    string? Mode,
    Maneuver? Maneuver,
    string? RotaryName,
    string? RotaryPronunciation,
    string? DrivingSide
);