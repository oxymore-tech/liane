using System.Collections.Immutable;
using Liane.Api.Util;

namespace Liane.Api
{
    public sealed class Route
    {
        // Alt + Inser
        public Route(string code, Status? status, ImmutableList<Waypoint> waypoints, ImmutableDictionary<string, Waypoint> legs)
        {
            Code = code;
            Status = status;
            Waypoints = waypoints;
            Legs = legs;
        }

        public string Code { get; }
        
        public Status? Status { get; }
        
        public ImmutableList<Waypoint> Waypoints { get; }
        
        public ImmutableDictionary<string, Waypoint> Legs { get; }

        public override string ToString()
        {
            return StringUtils.ToString(this);
        }
    }
}