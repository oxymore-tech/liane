using Liane.Api.Routing;

namespace Liane.Api.Trip;

public sealed class RallyingPointFilter
{
  public double? Lat { get; set; } 
  public double? Lng { get; set; }
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

  public static RallyingPointFilter Create(LatLng center, int? radius = null, int? limit = null)
  {
    return new RallyingPointFilter{Lng = center.Lng, Lat = center.Lat, Distance = radius, Limit = limit};
  }
  
  
}