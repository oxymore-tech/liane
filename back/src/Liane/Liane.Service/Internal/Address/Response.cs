using System.Collections.Immutable;
using Liane.Api.Address;

namespace Liane.Service.Internal.Address
{
    public sealed class Response
    {
        public Response(int placeId, string licence, string osmType, int osmId, ImmutableList<double> boudingbox, double lat, double lon, string display_name, string @class, string type,
            float importance, AddressDetails address, string? icon)
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
            Icon = icon!=null?$"http://liane.gjini.co:7070{icon}":null;
        }

        public int PlaceId { get; }
        public string Licence { get; }
        public string OsmType { get; }
        public int OsmId { get; }
        public ImmutableList<double> Boudingbox { get; }
        public double Lat { get; }
        public double Lon { get; }
        public string DisplayName { get; }
        public string Class { get; }
        public string Type { get; }
        public float Importance { get; }
        public string? Icon { get; }
        public AddressDetails Address { get; }
    }
}