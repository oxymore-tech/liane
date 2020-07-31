using System.Collections.Immutable;
using Liane.Api.Util;

namespace Liane.Service.Internal.Osrm.Response
{
    public sealed class Routing : Response
    {
        public Routing(Code code, string? message, string? data_version, ImmutableList<Waypoint> waypoints, ImmutableList<Route> routes) : base(code, message, data_version)
        {
            Waypoints = waypoints;
            Routes = routes;
        }
        // Inherit code status from Response
        // In case of error, code = NoRoute

        // Array of Waypoint objects
        // representing all waypoints in order.
        public ImmutableList<Waypoint> Waypoints { get; }

        // An array of Route objects,
        // ordered by descending recommendation rank.
        public ImmutableList<Route> Routes { get; }

        public override string ToString()
        {
            return StringUtils.ToString(this);
        }
    }
}