using System;
using System.Collections.Immutable;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

using LngLatTuple = Tuple<double, double>;

public sealed record PointDisplay(RallyingPoint RallyingPoint, ImmutableList<Liane> Lianes);

public sealed record LianeSegment(ImmutableList<LngLatTuple> Coordinates, ImmutableList<Ref<Liane>> Lianes);

public sealed record LianeDisplay(ImmutableList<PointDisplay> Points, ImmutableList<LianeSegment> Segments, ImmutableList<Liane> Lianes);