using System;
using System.Collections.Immutable;
using System.Linq;

namespace Liane.Api.Trip;

public sealed record Trip(
    ImmutableList<RallyingPoint> Coordinates,
    string? User = null,
    int? Time = null
)
{
    public bool Equals(Trip? other)
    {
        if (ReferenceEquals(null, other)) return false;
        if (ReferenceEquals(this, other)) return true;
        return Coordinates.SequenceEqual(other.Coordinates) && User == other.User && Time == other.Time;
    }

    public override int GetHashCode()
    {
        return HashCode.Combine(Coordinates, User, Time);
    }
}