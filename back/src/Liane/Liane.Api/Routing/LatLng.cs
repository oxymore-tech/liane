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
      return new(double.Parse(values[1]), double.Parse(values[0]));
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

  public static bool operator ==(LatLng a, LatLng b) => a.Equals(b);

  public static bool operator !=(LatLng a, LatLng b) => !a.Equals(b);

  private static bool AreVeryClose(double a, double b)
  {
    // 0.000001 in lon/lat is approximately  11 cm
    return Math.Abs(a - b) < 0.000001;
  }

  private bool Equals(LatLng other)
  {
    return AreVeryClose(Lat, other.Lat) && AreVeryClose(Lng, other.Lng); //Lat.Equals(other.Lat) && Lng.Equals(other.Lng);
  }

  public override bool Equals(object? obj)
  {
    return obj is LatLng other && Equals(other);
  }

  public override int GetHashCode()
  {
    return HashCode.Combine(Math.Round(Lat, 6), Math.Round(Lng, 6));
  }

  ///  
  /// Returns the cross product: vector1.X*vector2.Y - vector1.Y*vector2.X 
  /// 
  ///  The second Vector 
  public double CrossProduct(LatLng vector2)
  {
    return Lng * vector2.Lat - Lat * vector2.Lng;
  }

  #region Public Operators

  /// 
  /// Operator -LatLng (unary negation) 
  /// 
  public static LatLng operator -(LatLng vector)
  {
    return new LatLng(-vector.Lat, -vector.Lng);
  }

  /// 
  /// Negates the values of X and Y on this LatLng
  /// 
  public LatLng Negate()
  {
    return new LatLng(-Lat, -Lng);
  }

  /// 
  /// Operator LatLng + LatLng
  /// 
  public static LatLng operator +(LatLng vector1, LatLng vector2)
  {
    return new LatLng(vector1.Lat + vector2.Lat, vector1.Lng + vector2.Lng);
  }

  /// 
  /// Operator LatLng - LatLng
  /// 
  public static LatLng operator -(LatLng vector1, LatLng vector2)
  {
    return new LatLng(vector1.Lat - vector2.Lat, vector1.Lng - vector2.Lng);
  }

  /// 
  /// Operator LatLng * double 
  /// 
  public static LatLng operator *(LatLng vector, double scalar)
  {
    return new LatLng(vector.Lat * scalar, vector.Lng * scalar);
  }

  /// 
  /// Operator double * LatLng 
  /// 
  public static LatLng operator *(double scalar, LatLng vector)
  {
    return new LatLng(vector.Lat * scalar, vector.Lng * scalar);
  }

  /// 
  /// Operator LatLng / double 
  /// 
  public static LatLng operator /(LatLng vector, double scalar)
  {
    return vector * (1.0 / scalar);
  }

  /// 
  /// Operator LatLng * LatLng, interpreted as their dot product
  /// 
  public static double operator *(LatLng vector1, LatLng vector2)
  {
    return vector1.Lng * vector2.Lng + vector1.Lat * vector2.Lat;
  }

  /// 
  /// Determinant - Returns the determinant det(vector1, vector2)
  /// 
  ///  
  /// Returns the determinant: vector1.X*vector2.Y - vector1.Y*vector2.X
  ///  
  ///  The first LatLng 
  ///  The second LatLng 
  public static double Determinant(LatLng vector1, LatLng vector2)
  {
    return vector1.Lng * vector2.Lat - vector1.Lat * vector2.Lng;
  }

  #endregion Public Operators
}