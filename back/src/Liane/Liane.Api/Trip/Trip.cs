using System.Collections.Immutable;
using Liane.Api.Display;

namespace Liane.Api.Trip
{
    public sealed record Trip(ImmutableList<RallyingPoint> Coordinates);
}