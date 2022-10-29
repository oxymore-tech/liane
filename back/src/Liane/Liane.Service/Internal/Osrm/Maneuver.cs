using LngLatTuple = System.Tuple<double, double>;

namespace Liane.Service.Internal.Osrm;

/// <summary>
/// 
/// </summary>
/// <param name="Location">A [longitude, latitude] pair describing the location of the turn.</param>
/// <param name="Type">A string indicating the type of maneuver. new identifiers might be introduced without API change Types unknown to the client should be handled like the turn type, the existence of correct modifier values is guaranteed.</param>
/// <param name="BearingBefore">The clockwise angle from true north to the direction of travel immediately before the maneuver. Range 0-359.</param>
/// <param name="BearingAfter">The clockwise angle from true north to the direction of travel immediately after the maneuver. Range 0-359.</param>
/// <param name="Modifier">An optional string indicating the direction change of the maneuver.</param>
/// <param name="Exit">An optional integer indicating number of the exit to take. The property exists for the roundabout / rotary property: Number of the roundabout exit to take. If exit is undefined the destination is on the roundabout.</param>
public sealed record Maneuver(
    LngLatTuple Location,
    string Type,
    int BearingBefore,
    int BearingAfter,
    string? Modifier,
    int? Exit
);