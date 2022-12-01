using System;

namespace Liane.Api.Routing;

public sealed record WayPoint(RallyingPoint.RallyingPoint RallyingPoint, int Order) : IComparable<WayPoint>
{
    public int CompareTo(WayPoint? other)
    {
        if (ReferenceEquals(this, other)) return 0;
        return ReferenceEquals(null, other) 
            ? 1 
            : Order.CompareTo(other.Order);
    }
}