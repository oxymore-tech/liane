using System.Collections.Immutable;

namespace Liane.Service.Internal.Osrm;

/// <summary>
/// Represents a route between two waypoints.
/// </summary>
/// <param name="Distance">The distance traveled by this route leg, in float meters.</param>
/// <param name="Duration">The estimated travel time, in float number of seconds.</param>
/// <param name="Steps">Depends on the steps parameter : if true then array of RouteStep objects describing the turn-by-turn instructions</param>
/// <param name="Weight">The calculated weight of the route leg.</param>
/// <param name="Annotation">Additional details about each coordinate along the route geometry.</param>
public sealed record Leg(
    float Distance,
    float Duration,
    ImmutableList<Step> Steps,
    float? Weight,
    Annotation? Annotation
);