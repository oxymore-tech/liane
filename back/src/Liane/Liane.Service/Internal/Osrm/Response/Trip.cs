using System.Collections.Immutable;

namespace Liane.Service.Internal.Osrm.Response;

/// <summary>
/// Wrapper for Trip Response.
/// </summary>
/// <param name="Code"></param> the result Code
/// <param name="Waypoints"></param> Array of Waypoint objects representing all waypoints in input order.
/// <param name="Trips"></param> An array of Route objects that assemble the trace.
public sealed record Trip(string Code, ImmutableList<TripWaypoint> Waypoints, ImmutableList<Route> Trips);