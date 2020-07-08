using System.Collections.Immutable;

namespace Liane.Service.Internal.Nominatim
{
    public sealed class Response
    {
        // [
        //     {
        //         "place_id":105581712,
        //         "licence":"Data © OpenStreetMap contributors, ODbL 1.0. https://osm.org/copyright",
        //         "osm_type":"way",
        //         "osm_id":90394480,
        //         "boundingbox":["52.5487473","52.5488481","-1.816513","-1.8163464"],
        //         "lat":"52.5487921",
        //         "lon":"-1.8164308339635031",
        //         "display_name":"135, Pilkington Avenue, Sutton Coldfield, Birmingham, West Midlands Combined Authority, West Midlands, England, B72 1LH, Royaume-Uni",
        //         "class":"building",
        //         "type":"residential",
        //         "importance":0.411,
        //         
        //     }
        // ]
        public Response(int placeId, string licence, string osmType, int osmId, ImmutableArray<double> boudingbox, double lat, double lng, string displayName, string @class, string type, float importance, Address address)
        {
            PlaceId = placeId;
            Licence = licence;
            OsmType = osmType;
            OsmId = osmId;
            Boudingbox = boudingbox;
            Lat = lat;
            Lng = lng;
            DisplayName = displayName;
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
        public double Lng { get; }
        public string DisplayName { get; }
        public string Class { get; }
        public string Type { get; }
        public float Importance { get; } 
        public Address Address { get; }
    


    }
}