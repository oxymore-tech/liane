using System;
using System.Collections.Immutable;
using GeoJSON.Text.Feature;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

using LngLatTuple = Tuple<double, double>;

public sealed record LianeSegment(ImmutableList<LngLatTuple> Coordinates, ImmutableList<Ref<Trip>> Lianes);

public sealed record LianeMatchDisplay(FeatureCollection Features, ImmutableList<LianeMatch> LianeMatches);

public sealed record RallyingPointLink(RallyingPoint Deposit, ImmutableList<DateTime> Hours);