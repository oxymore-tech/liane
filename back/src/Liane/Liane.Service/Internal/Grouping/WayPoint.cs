using System;
using Liane.Api.RallyingPoints;

namespace Liane.Service.Internal.Grouping;

internal sealed record WayPoint(RallyingPoint RallyingPoint, int Order) : IComparable<WayPoint>
{
    public int CompareTo(WayPoint? other)
    {
        if (ReferenceEquals(this, other)) return 0;
        if (ReferenceEquals(null, other)) return 1;
        return Order.CompareTo(other.Order);
    }
}