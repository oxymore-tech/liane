using System.Collections.Immutable;
using LngLatTuple = System.Tuple<double, double>;

namespace Liane.Service.Internal.Osrm;

/// <summary>
///      Object used to describe waypoint on a route.
/// </summary>
/// <param name="Name"></param>
/// <param name="Location">Array that contains the [longitude, latitude] pair of the snapped coordinate</param>
/// <param name="Distance">The distance, in metres, from the input coordinate to the snapped coordinate</param>
/// <param name="Hint"> Unique internal identifier of the segment (ephemeral, not constant over data updates) This can be used on subsequent request to significantly speed up the query and to connect multiple services. E.g. you can use the hint value obtained by the nearest query as hint values for route inputs.</param>
/// <param name="Nodes">Additional properties seen in a Nearest Response Array of OpenStreetMap node ids.</param>
public record Waypoint(
    string Name,
    LngLatTuple Location,
    float Distance,
    string Hint,
    ImmutableList<long>? Nodes
);

/// <summary>
/// Object used to describe a waypoint in a trip
/// </summary>
/// <param name="TripsIndex"></param> Index to trips of the sub-trip the point was matched to.
/// <param name="WaypointIndex"></param> Index of the point in the trip.
public sealed record TripWaypoint(
    string Name,
    LngLatTuple Location,
    float Distance,
    string Hint,
    ImmutableList<long>? Nodes,
    int TripsIndex,
    int WaypointIndex
    
) : Waypoint(
    Name, Location, Distance, Hint, Nodes
    );