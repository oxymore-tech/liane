using System;
using System.Collections.Immutable;
using System.Linq;
using LngLatTuple = System.Tuple<double, double>;

namespace Liane.Api.Routing;

public static class LatLngExtensions
{
  
  public static (LatLng, int)? GetFirstIntersection(this ImmutableList<LatLng> route1, ImmutableList<LatLng> route2)
  {
    if (route1.Count < 2 || route2.Count < 2)
    {
      return null;
    }

    for (var i = 1; i < route1.Count; i++)
    {
      var a = route1[i - 1];
      var b = route1[i];
      for (var j = 1; j < route2.Count; j++)
      {
        var c = route2[j - 1];
        var d = route2[j];
        if (LineSegmentsIntersect(a, b, c, d, out var intersection))
        {
          return (intersection, i-1);
        }
      }
    }

    return null;
  }
  
  public static (LatLng, int)? GetLastIntersection(this ImmutableList<LatLng> route1, ImmutableList<LatLng> route2)
  {
    if (route1.Count < 2 || route2.Count < 2)
    {
      return null;
    }

    for (var i = route1.Count - 1; i > 1; i--)
    {
      var a = route1[i];
      var b = route1[i - 1];
      for (var j = route2.Count - 1; j > 1; j--)
      {
        var c = route2[j];
        var d = route2[j - 1];
        if (LineSegmentsIntersect(a, b, c, d, out var intersection))
        {
          return (intersection, i);
        }
      }
    }

    return null;
  }

  public static ImmutableList<LatLng> ToLatLng(this ImmutableList<LngLatTuple> coordinates) => coordinates.Select(t => (LatLng)t).ToImmutableList();

  public static ImmutableList<LngLatTuple> ToLngLatTuple(this ImmutableList<LatLng> coordinates) => coordinates.Select(t => (LngLatTuple)t).ToImmutableList();

  public static LngLatTuple ToLngLatTuple(this LatLng latLng) => new(latLng.Lng, latLng.Lng);

  public static LatLng ToLatLng(this LngLatTuple coordinates) => new(coordinates.Item2, coordinates.Item1);

  /// <summary>
  /// Test whether two line segments intersect. If so, calculate the intersection point.
  /// <see cref="http://stackoverflow.com/a/14143738/292237"/>
  /// </summary>
  /// <param name="p">Vector to the start point of p.</param>
  /// <param name="p2">Vector to the end point of p.</param>
  /// <param name="q">Vector to the start point of q.</param>
  /// <param name="q2">Vector to the end point of q.</param>
  /// <param name="intersection">The point of intersection, if any.</param>
  /// <param name="considerCollinearOverlapAsIntersect">Do we consider overlapping lines as intersecting?
  /// </param>
  /// <returns>True if an intersection point was found.</returns>
  public static bool LineSegmentsIntersect(LatLng p, LatLng p2, LatLng q, LatLng q2, out LatLng intersection, bool considerCollinearOverlapAsIntersect = true)
  {
    intersection = new LatLng();

    var r = p2 - p;
    var s = q2 - q;
    var rxs = r.CrossProduct(s);
    var qpxr = (q - p).CrossProduct(r);

    // If r x s = 0 and (q - p) x r = 0, then the two lines are collinear.
    if (rxs.IsZero() && qpxr.IsZero())
    {
      // 1. If either  0 <= (q - p) * r <= r * r or 0 <= (p - q) * s <= * s
      // then the two lines are overlapping,
      if (!considerCollinearOverlapAsIntersect)
      {
        return false;
      }

      var lineSegmentsIntersect = (0 <= (q - p) * r && (q - p) * r <= r * r) || (0 <= (p - q) * s && (p - q) * s <= s * s);
      
      if (lineSegmentsIntersect)
      {
        intersection = p;
      }
      
      return lineSegmentsIntersect;
      // 2. If neither 0 <= (q - p) * r = r * r nor 0 <= (p - q) * s <= s * s
      // then the two lines are collinear but disjoint.
      // No need to implement this expression, as it follows from the expression above.
    }

    // 3. If r x s = 0 and (q - p) x r != 0, then the two lines are parallel and non-intersecting.
    if (rxs.IsZero() && !qpxr.IsZero())
    {
      return false;
    }

    // t = (q - p) x s / (r x s)
    var t = (q - p).CrossProduct(s) / rxs;

    // u = (q - p) x r / (r x s)

    var u = (q - p).CrossProduct(r) / rxs;

    // 4. If r x s != 0 and 0 <= t <= 1 and 0 <= u <= 1
    // the two line segments meet at the point p + t r = q + u s.
    if (rxs.IsZero() || t is < 0 or > 1 || u is < 0 or > 1)
    {
      return false;
    }

    // We can calculate the intersection point using either t or u.
    intersection = p + t * r;

    // An intersection was found.
    return true;

    // 5. Otherwise, the two line segments are not parallel but do not intersect.
  }

  private const double Epsilon = 1e-5;

  public static bool IsZero(this double d)
  {
    return Math.Abs(d) < Epsilon;
  }
}