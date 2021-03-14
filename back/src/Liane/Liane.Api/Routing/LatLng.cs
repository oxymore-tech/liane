using System.Globalization;

namespace Liane.Api.Routing
{
    public sealed record LatLng(double Lat, double Lng)
    {
        public string ToLngLatString()
        {
            return $"{Lng.ToString(CultureInfo.InvariantCulture)},{Lat.ToString(CultureInfo.InvariantCulture)}";
        }

        public LngLatTuple ToLngLatTuple()
        {
            return new(Lng, Lat);
        }
    }
}