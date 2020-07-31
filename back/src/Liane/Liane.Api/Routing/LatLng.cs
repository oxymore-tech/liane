using System;
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

        private bool Equals(LatLng other)
        {
            return Lat.Equals(other.Lat) && Lng.Equals(other.Lng);
        }

        public override bool Equals(object? obj)
        {
            return ReferenceEquals(this, obj) || obj is LatLng other && Equals(other);
        }

        public override int GetHashCode()
        {
            return HashCode.Combine(Lat, Lng);
        }
    }
}