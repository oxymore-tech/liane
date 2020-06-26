using System.Collections.Immutable;

namespace Liane.Api.Osrm
{
    public sealed class Geojson
    {
        // TODO: comment on GeoJSON structure
        public Geojson(string type, ImmutableList<ImmutableList<float>> coordinates)
        {
            Type = type;
            Coordinates = coordinates; 
        }

        public string Type { get; }
        public ImmutableList<ImmutableList<float>> Coordinates { get; }
        
        public override string ToString()
        {
            return "Geometry object here"; // raccourci car trop gros
            //            return StringUtils.ToString(this);
        }

        
    }
}