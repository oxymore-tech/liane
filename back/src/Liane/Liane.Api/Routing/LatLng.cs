using System;
using System.Globalization;

namespace Liane.Api.Routing
{
    public sealed record LatLng(double Lat, double Lng)
    {
        public string ToLngLatString()
        {
            return $"{Lng.ToString(CultureInfo.InvariantCulture)},{Lat.ToString(CultureInfo.InvariantCulture)}";
        }

        public double CalculateDistance(LatLng other) => CalculateDistance(other.Lat, other.Lng);

        public double CalculateDistance(double lat, double lng)
        {
            var d1 = Lat * (Math.PI / 180.0);
            var num1 = Lng * (Math.PI / 180.0);
            var d2 = lat * (Math.PI / 180.0);
            var num2 = lng * (Math.PI / 180.0) - num1;
            var d3 = Math.Pow(Math.Sin((d2 - d1) / 2.0), 2.0) +
                     Math.Cos(d1) * Math.Cos(d2) * Math.Pow(Math.Sin(num2 / 2.0), 2.0);
            return 6376500.0 * (2.0 * Math.Atan2(Math.Sqrt(d3), Math.Sqrt(1.0 - d3)));
        }

        public LngLatTuple ToLngLatTuple()
        {
            return new(Lng, Lat);
        }
    }
}