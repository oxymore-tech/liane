using System.Collections.Immutable;
using Liane.Api.Util;

namespace Liane.Api.Osrm
{
    // Object used to describe waypoint on a route.
    public sealed class Waypoint
    {
        
        // Name of the street the coordinate snapped to
        public Waypoint(string name, ImmutableList<float> location, float distance, string hint, ImmutableArray<int>? nodes)
        {
            Name = name;
            Location = location;
            Distance = distance;
            Hint = hint;
            Nodes = nodes;
        }

        public string Name { get; }
        // Array that contains the [longitude, latitude]
        // pair of the snapped coordinate
        public ImmutableList<float> Location { get; }
        // The distance, in metres, from the input coordinate
        // to the snapped coordinate
        public float Distance { get; }
        // Unique internal identifier of the segment (ephemeral, not constant over data updates) This can be used on subsequent request to significantly speed up the query and to connect multiple services. E.g. you can use the hint value obtained
        // by the nearest query as hint values for route inputs.
        public string Hint { get; }
        
        
        // Additional properties seen in a Nearest Response
        // Array of OpenStreetMap node ids.
        public ImmutableArray<int> ?Nodes { get; }
        
        public override string ToString()
        {
            return StringUtils.ToString(this);
        }

    }
}