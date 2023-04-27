using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using Liane.Api.Routing;

namespace Liane.Service.Internal.Routing;

public sealed class Simplifier
{
  private const double MatchTolerance = 0.001D;
  public static ImmutableList<LatLng> Simplify(Route route) => Simplify(route.Coordinates.ToLatLng(), MatchTolerance);

  public static ImmutableList<LatLng> Simplify(ImmutableList<LatLng> points, double tolerance = 1.0, bool highestQuality = false)
  {
    if (points.Count <= 2)
    {
      return points;
    }

    var sqTolerance = tolerance * tolerance;
    points = highestQuality ? points : SimplifyRadialDist(points, sqTolerance);
    points = SimplifyDouglasPeucker(points, sqTolerance);
    return points;
  }

  private static double GetSqDist(LatLng p1, LatLng p2)
  {
    var num1 = p1.Lng - p2.Lng;
    var num2 = p1.Lat - p2.Lat;
    return num1 * num1 + num2 * num2;
  }

  private static double GetSqSegDist(LatLng p, LatLng p1, LatLng p2)
  {
    var x = p1.Lng;
    var y = p1.Lat;
    var num1 = p2.Lng - x;
    var num2 = p2.Lat - y;
    if (Math.Abs(num1) > 0.0 || Math.Abs(num2) > 0.0)
    {
      var num3 = ((p.Lng - x) * num1 + (p.Lat - y) * num2) / (num1 * num1 + num2 * num2);
      switch (num3)
      {
        case > 1.0:
          x = p2.Lng;
          y = p2.Lat;
          break;
        case > 0.0:
          x += num1 * num3;
          y += num2 * num3;
          break;
      }
    }

    var num4 = p.Lng - x;
    var num5 = p.Lat - y;
    return num4 * num4 + num5 * num5;
  }

  private static ImmutableList<LatLng> SimplifyRadialDist(IReadOnlyList<LatLng> points, double sqTolerance)
  {
    var p1 = new LatLng(0, 0);
    var p2 = points[0];
    var pointList = ImmutableList.CreateBuilder<LatLng>();
    pointList.Add(p2);
    var index = 1;
    for (var count = points.Count; index < count; ++index)
    {
      p1 = points[index];
      if (!(GetSqDist(p1, p2) > sqTolerance))
      {
        continue;
      }

      pointList.Add(p1);
      p2 = p1;
    }

    if (p2 != p1)
    {
      pointList.Add(p1);
    }

    return pointList.ToImmutableList();
  }

  private static void SimplifyDpStep(
    IReadOnlyList<LatLng> points,
    int first,
    int last,
    double sqTolerance,
    ICollection<LatLng> simplified)
  {
    var num1 = sqTolerance;
    var num2 = 0;
    for (var index = first + 1; index < last; ++index)
    {
      var sqSegDist = GetSqSegDist(points[index], points[first], points[last]);
      if (!(sqSegDist > num1))
      {
        continue;
      }

      num2 = index;
      num1 = sqSegDist;
    }

    if (num1 <= sqTolerance)
    {
      return;
    }

    if (num2 - first > 1)
    {
      SimplifyDpStep(points, first, num2, sqTolerance, simplified);
    }

    simplified.Add(points[num2]);
    if (last - num2 <= 1)
    {
      return;
    }

    SimplifyDpStep(points, num2, last, sqTolerance, simplified);
  }

  private static ImmutableList<LatLng> SimplifyDouglasPeucker(IReadOnlyList<LatLng> points, double sqTolerance)
  {
    var num = points.Count - 1;
    var simplified = ImmutableList.CreateBuilder<LatLng>();
    simplified.Add(points[0]);
    SimplifyDpStep(points, 0, num, sqTolerance, simplified);
    simplified.Add(points[num]);
    return simplified.ToImmutableList();
  }
}