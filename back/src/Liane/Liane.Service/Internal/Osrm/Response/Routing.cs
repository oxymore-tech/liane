using System.Collections.Immutable;

namespace Liane.Service.Internal.Osrm.Response
{
    public sealed record Routing(string Code, ImmutableList<Waypoint> Waypoints, ImmutableList<Route> Routes);
}