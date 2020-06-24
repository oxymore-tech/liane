using System.Collections.Immutable;

namespace Liane.Api.Object
{
    public sealed class Geojson
    {
        public Geojson(string type, ImmutableList<Coordinate> coordinates)
        {
            Type = type;
            Coordinates = coordinates; // TODO
        }

        public string Type { get; }
        public ImmutableList<Coordinate> Coordinates { get; }
        
    }

    public sealed class Coordinate
    {
        public Coordinate(ImmutableList<float> coord)
        {
            Coord = coord;
        }

        public ImmutableList<float> Coord { get; } 
    }
}