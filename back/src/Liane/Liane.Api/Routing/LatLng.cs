using System.Globalization;

namespace Liane.Api.Routing
{
    public sealed class LatLng
    {
        public LatLng(double lat, double lng)
        {
            Lat = lat;
            Lng = lng;
        }

        public double Lat { get; }
        public double Lng { get; }

        public string ToLngLatString()
        {
            return $"{Lng.ToString(CultureInfo.InvariantCulture)},{Lat.ToString(CultureInfo.InvariantCulture)}";
        }
    }
}