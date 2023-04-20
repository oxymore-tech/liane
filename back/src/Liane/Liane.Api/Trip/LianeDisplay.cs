using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

using LngLatTuple = Tuple<double, double>;

public sealed record PointDisplay(RallyingPoint RallyingPoint, ImmutableList<Liane> Lianes);

public sealed record LianeSegment(ImmutableList<LngLatTuple> Coordinates, ImmutableList<Ref<Liane>> Lianes);

public sealed record LianeDisplay(ImmutableList<LianeSegment> Segments, ImmutableList<Liane> Lianes);

public sealed record LianeMatchDisplay(ImmutableList<LianeSegment> Segments, ImmutableList<LianeMatch> LianeMatches);

public sealed record RallyingPointLink(RallyingPoint Deposit, ImmutableList<DateTime> Hours); 
public sealed record ClosestPickups(RallyingPoint Pickup, ImmutableList<RallyingPointLink> Destinations); 
