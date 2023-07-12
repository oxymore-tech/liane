using System;
using System.Collections.Generic;
using Liane.Api.Trip;

namespace Liane.Service.Internal.Trip;

public sealed class DistanceFromComparer : IComparer<LianeMatch>
{
  public int Compare(LianeMatch? x, LianeMatch? y)
  {
    if (x is null)
    {
      if (y is null)
      {
        return 0;
      }

      return -1;
    }

    if (y is null)
    {
      return 1;
    }

    var distance1 = GetDistanceScore(x.Match);
    var distance2 = GetDistanceScore(y.Match);

    return distance1.fromDist - distance2.fromDist;
  }

  private static (int fromDist, int toDist) GetDistanceScore(Match m)
  {
    return m switch
    {
      Match.Exact => (0, 0),
      Match.Compatible c => (c.Delta.PickupInMeters, c.Delta.DepositInMeters),
      _ => throw new ArgumentOutOfRangeException(nameof(m), m, null)
    };
  }
}