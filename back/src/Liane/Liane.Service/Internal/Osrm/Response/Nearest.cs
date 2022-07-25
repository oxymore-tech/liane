using System.Collections.Immutable;

namespace Liane.Service.Internal.Osrm.Response;

public sealed record Nearest(string Code, ImmutableList<Waypoint> Waypoints);