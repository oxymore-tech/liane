using System.Collections.Immutable;
using System.Globalization;
using System.Linq;
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

    public static class LatLngExtensions
    {
        public static ImmutableList<LatLng> ToLatLng(this ImmutableList<LngLat> coordinates) => coordinates.Select(c => c.ToLatLng()).ToImmutableList();

        public static ImmutableList<LngLat> ToLngLat(this ImmutableList<LatLng> coordinates) => coordinates.Select(c => c.ToLngLat()).ToImmutableList();
    }
}