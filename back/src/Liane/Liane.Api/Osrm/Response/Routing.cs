using System.Collections.Immutable;
using Liane.Api.Util;

namespace Liane.Api.Osrm.Response
{
    public sealed class Routing : Response
    {
        public Routing(ImmutableArray<Route> routes, ImmutableArray<Waypoint> waypoints)
        {
            Routes = routes;
            Waypoints = waypoints;
        }
        // Inherit code status from Response
        // In case of error, code = NoRoute
        
        // Array of Waypoint objects
        // representing all waypoints in order.
        public ImmutableArray<Waypoint> Waypoints { get; }
        // An array of Route objects,
        // ordered by descending recommendation rank.
        public ImmutableArray<Route> Routes { get; }
        
        public override string ToString()
        {
            return StringUtils.ToString(this);
        }

    }
}