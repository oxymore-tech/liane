using System.Collections.Generic;
using Liane.Api.Trip;

namespace Liane.Service.Internal.Trip;

public sealed class BestMatchComparer : IComparer<LianeMatch>
{
  private readonly RallyingPoint from;
  private readonly RallyingPoint to;
  private readonly DepartureOrArrivalTime targetTime;

  public BestMatchComparer(RallyingPoint from, RallyingPoint to, DepartureOrArrivalTime targetTime)
  {
    this.from = from;
    this.to = to;
    this.targetTime = targetTime;
  }

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

    var h1 = (targetTime.DateTime - x.Liane.DepartureTime).Hours / 2;
    var h2 = (targetTime.DateTime - y.Liane.DepartureTime).Hours / 2;

    var hourDelta = h1 - h2;

    if (hourDelta != 0)
    {
      return hourDelta;
    }

    var distance1 = GetDistanceScore(x.Match);
    var distance2 = GetDistanceScore(y.Match);
    return distance1 - distance2;
  }

  private int GetDistanceScore(Match m)
  {
    if (m is not Match.Compatible c)
    {
      return 0;
    }

    var fromDist = (int)from.Location.Distance(c.Pickup.Location) + 1;
    var toDist = (int)to.Location.Distance(c.Deposit.Location) + 1;

    return fromDist * toDist;
  }
}