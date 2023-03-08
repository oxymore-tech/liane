using System.Collections.Immutable;
using Liane.Api.Routing;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public sealed record PointDisplay(Ref<RallyingPoint> RallyingPoint, ImmutableList<Liane> Lianes);

public sealed record LianeSegment(ImmutableList<LatLng> Coordinates, int Weight, ImmutableList<Ref<Liane>> Lianes);

public sealed record LianeDisplay(ImmutableList<PointDisplay> Points, ImmutableList<LianeSegment> Segments);