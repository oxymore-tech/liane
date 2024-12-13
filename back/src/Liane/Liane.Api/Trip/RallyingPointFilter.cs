using Liane.Api.Routing;

namespace Liane.Api.Trip;

public sealed class RallyingPointFilter
{
  public double? Lat { get; set; }
  public double? Lng { get; set; }
  public double? Lat2 { get; set; }
  public double? Lng2 { get; set; }
  public int? Distance { get; set; }
  public string? Search { get; set; }
  public int? Offset { get; set; }
  public int? Limit { get; set; }

  public LocationType[]? Types { get; set; }

  public LatLng? GetLatLng()
  {
    if (Lat != null && Lng != null)
    {
      return new LatLng(Lat.Value, Lng.Value);
    }

    return null;
  }

  public (LatLng, LatLng)? GetBbox()
  {
    if (Lat != null && Lng != null && Lat2 != null && Lng2 != null)
    {
      return (new LatLng(Lat.Value, Lng.Value), new LatLng(Lat2.Value, Lng2.Value));
    }

    return null;
  }

  public static RallyingPointFilter Create(LatLng center, int? radius = null, int? limit = null)
  {
    return new RallyingPointFilter { Lng = center.Lng, Lat = center.Lat, Distance = radius, Limit = limit };
  }
}