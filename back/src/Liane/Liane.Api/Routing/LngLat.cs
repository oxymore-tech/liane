using System.Globalization;
using Liane.Api.Util;
using Newtonsoft.Json;

namespace Liane.Api.Routing
{
    [JsonConverter(typeof(LngLatJsonConverter))]
    public class LngLat
    {
        public LngLat(double lng, double lat)
        {
            Lng = lng;
            Lat = lat;
        }

        public double Lat { get; }
        public double Lng { get; }

        public string ToLngLatString()
        {
            return $"{Lng.ToString(CultureInfo.InvariantCulture)},{Lat.ToString(CultureInfo.InvariantCulture)}";
        }

        public override string ToString()
        {
            return StringUtils.ToString(this);
        }

        public LatLng ToLatLng()
        {
            return new LatLng(Lat, Lng);
        }
    }
}