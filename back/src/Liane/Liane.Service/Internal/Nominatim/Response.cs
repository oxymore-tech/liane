using System.Collections.Immutable;

namespace Liane.Service.Internal.Nominatim
{
    public sealed class Response
    {
        public Response(int placeId, string licence, string osmType, int osmId, ImmutableArray<double> boudingbox, double lat, double lon, string display_name, string @class, string type,
            float importance, Address address)
        {
            PlaceId = placeId;
            Licence = licence;
            OsmType = osmType;
            OsmId = osmId;
            Boudingbox = boudingbox;
            Lat = lat;
            Lon = lon;
            DisplayName = display_name;
            Class = @class;
            Type = type;
            Importance = importance;
            Address = address;
        }

        public int PlaceId { get; }
        public string Licence { get; }
        public string OsmType { get; }
        public int OsmId { get; }
        public ImmutableArray<double> Boudingbox { get; }
        public double Lat { get; }
        public double Lon { get; }
        public string DisplayName { get; }
        public string Class { get; }
        public string Type { get; }
        public float Importance { get; }
        public Address Address { get; }
    }
}