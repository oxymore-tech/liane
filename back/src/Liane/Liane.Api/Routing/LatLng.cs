using System;
using System.Globalization;
using System.Text.Json.Serialization;
using LngLatTuple = System.Tuple<double, double>;

namespace Liane.Api.Routing;

public readonly struct LatLng
{
  public double Lat { get; }
  public double Lng { get; }

  public static implicit operator LngLatTuple(LatLng latLng) => new(latLng.Lng, latLng.Lat);
  public static implicit operator LatLng(LngLatTuple latLng) => new(latLng.Item2, latLng.Item1);

  [JsonConstructor]
  public LatLng(double lat, double lng)
  {
    Lat = lat;
    Lng = lng;
  }

  public void Deconstruct(out double lat, out double lng)
  {
    lat = Lat;
    lng = Lng;
  }

  public override string ToString()
  {
    return $"{Lng.ToString(CultureInfo.InvariantCulture)},{Lat.ToString(CultureInfo.InvariantCulture)}";
  }

  public static LatLng Parse(string s)
  {
    var values = s.Split(",");
    if (values.Length == 2)
    {
      return new (double.Parse(values[1]), double.Parse(values[0]));
    }

    throw new FormatException();
  }

  public double Distance(LatLng other) => Distance(other.Lat, other.Lng);

  public double Distance(double lat, double lng)
  {
    var d1 = Lat * (Math.PI / 180.0);
    var num1 = Lng * (Math.PI / 180.0);
    var d2 = lat * (Math.PI / 180.0);
    var num2 = lng * (Math.PI / 180.0) - num1;
    var d3 = Math.Pow(Math.Sin((d2 - d1) / 2.0), 2.0) +
             Math.Cos(d1) * Math.Cos(d2) * Math.Pow(Math.Sin(num2 / 2.0), 2.0);
    return 6376500.0 * (2.0 * Math.Atan2(Math.Sqrt(d3), Math.Sqrt(1.0 - d3)));
  }

  public bool Equals(LatLng other)
  {
    return Lat.Equals(other.Lat) && Lng.Equals(other.Lng);
  }

  public override bool Equals(object? obj)
  {
    return obj is LatLng other && Equals(other);
  }

  public override int GetHashCode()
  {
    return HashCode.Combine(Lat, Lng);
  }
}