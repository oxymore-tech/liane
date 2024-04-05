using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using GeoJSON.Text.Feature;
using GeoJSON.Text.Geometry;
using Liane.Api.Routing;

namespace Liane.Api.Trip;

public static class TripDisplayExtensions
{
  public static IEnumerable<Feature> ToFeatures(this IEnumerable<TripSegment> segments)
  {
    return segments.Where(s => s.Coordinates.Count > 1)
      .Select(s => new Feature(new LineString(s.Coordinates.Select(c => new Position(c.Item2, c.Item1))), new Dictionary<string, dynamic>
      {
        { "trips", s.Trips }
      }));
  }

  public static IEnumerable<T> TakeUntilInclusive<T>(this IEnumerable<T> list, Func<T, bool> predicate)
  {
    foreach(var item in list)
    {
      yield return item;
      if (predicate(item))
        yield break;
    }
  }
  
  public static ImmutableList<WayPoint> GetMatchingTrip(this TripMatch tripMatch)
  {
    IEnumerable<WayPoint> waypoints;
    if (tripMatch.Match is Match.Compatible m)
    { 
      waypoints = m.WayPoints;
    }
    else
    {
      waypoints =  tripMatch.Trip.WayPoints;
    }
    return waypoints.SkipWhile(w => w.RallyingPoint.Id! != tripMatch.Match.Pickup.Id)
      .TakeUntilInclusive(w => w.RallyingPoint.Id! == tripMatch.Match.Deposit.Id)
      .ToImmutableList();
   
  }
}