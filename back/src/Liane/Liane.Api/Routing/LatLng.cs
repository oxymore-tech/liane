using System.Globalization;
using Liane.Api.Util;
using Newtonsoft.Json;

namespace Liane.Api.Routing
{
    [JsonConverter(typeof(LatLngJsonConverter))]
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

        public override string ToString()
        {
            return StringUtils.ToString(this);
        }

        public LngLat ToLngLat()
        {
            return new LngLat(Lng, Lat);
        }
    }
}