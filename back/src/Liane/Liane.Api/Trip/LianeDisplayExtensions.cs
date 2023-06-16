using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using GeoJSON.Text.Feature;
using GeoJSON.Text.Geometry;
using Liane.Api.Routing;

namespace Liane.Api.Trip;

public static class LianeDisplayExtensions
{
  public static IEnumerable<Feature> ToFeatures(this IEnumerable<LianeSegment> segments)
  {
    return segments.Where(s => s.Coordinates.Count > 1)
      .Select(s => new Feature(new LineString(s.Coordinates.Select(c => new Position(c.Item2, c.Item1))), new Dictionary<string, dynamic>
      {
        { "lianes", s.Lianes }
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
  public static ImmutableList<WayPoint> GetMatchingTrip(this LianeMatch lianeMatch)
  {
    IEnumerable<WayPoint> waypoints;
    if (lianeMatch.Match is Match.Compatible m)
    { 
      waypoints = m.WayPoints;
    }
    else
    {
      waypoints =  lianeMatch.Liane.WayPoints;
    }
    return waypoints.SkipWhile(w => w.RallyingPoint.Id! != lianeMatch.Match.Pickup.Id)
      .TakeUntilInclusive(w => w.RallyingPoint.Id! == lianeMatch.Match.Deposit.Id)
      .ToImmutableList();
   
  }
}