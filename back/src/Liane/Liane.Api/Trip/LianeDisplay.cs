using System;
using System.Collections.Immutable;
using GeoJSON.Text.Feature;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

using LngLatTuple = Tuple<double, double>;

public sealed record TripSegment(ImmutableList<LngLatTuple> Coordinates, ImmutableList<Ref<Trip>> Trips);

public sealed record LianeMatchDisplay(FeatureCollection Features, ImmutableList<TripMatch> LianeMatches);