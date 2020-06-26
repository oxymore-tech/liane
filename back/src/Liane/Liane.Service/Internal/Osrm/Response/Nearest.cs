using System.Collections.Immutable;

namespace Liane.Service.Internal.Osrm.Response
{
    public sealed class Nearest : Response
    {
        public Nearest(ImmutableArray<Waypoint> waypoints)
        {
            Waypoints = waypoints;
        }

        // array of Waypoint objects sorted by distance to the input coordinate.
        // Each object has at least the following additional properties:
        // nodes
        public ImmutableArray<Waypoint> Waypoints { get; }
        
    }
}