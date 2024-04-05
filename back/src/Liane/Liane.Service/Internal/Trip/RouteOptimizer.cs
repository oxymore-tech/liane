using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Trip;

using LngLatTuple = Tuple<double, double>;

internal static class RouteOptimizer
{
  public static ImmutableList<TripSegment> TruncateOverlappingSegments(ImmutableList<TripSegment> raw)
  {
    var cutCoordinate = new LngLatTuple(-1000, -1000);
    var groupedCoordinates = new Dictionary<LngLatTuple, TripSet>();
    var orderedCoordinates = new List<LngLatTuple>();
    foreach (var tripSegment in raw)
    {
      orderedCoordinates.Add(cutCoordinate);
      var lianeSet = new TripSet(tripSegment.Trips.ToHashSet());
      for (var index = 0; index < tripSegment.Coordinates.Count; index++)
      {
        var coordinate = tripSegment.Coordinates[index];
        if (groupedCoordinates.TryGetValue(coordinate, out var currentLianeSet))
        {
          groupedCoordinates[coordinate] = lianeSet.Merge(currentLianeSet);
          if (!orderedCoordinates.Last().Equals(cutCoordinate))
          {
            if (index < tripSegment.Coordinates.Count-1) orderedCoordinates.Add(tripSegment.Coordinates[index+1]);
            orderedCoordinates.Add(cutCoordinate);
          }
        }
        else
        {
          groupedCoordinates[coordinate] = lianeSet;
          if (index > 0 && orderedCoordinates.Last().Equals(cutCoordinate))orderedCoordinates.Add(tripSegment.Coordinates[index-1]);
          orderedCoordinates.Add(coordinate);
        }
      }
    }

    var tripSegments = new List<TripSegment>();
    var coordinates = new List<LngLatTuple>();
    TripSet? previousLianeSet = null;
    for (var index = 0; index < orderedCoordinates.Count; index++)
    {
      var coordinate = orderedCoordinates[index];
      if (coordinate.Equals(cutCoordinate))
      {
        // Special case the route is already truncated because is crossing another route
        if (previousLianeSet != null)
        {
          var lianeSegment = new TripSegment(coordinates.ToImmutableList(), previousLianeSet.Value.Trips);
          tripSegments.Add(lianeSegment);
        }

        coordinates.Clear();
        previousLianeSet = null;
        continue;
      }

      var currentLianeSet = groupedCoordinates[coordinate];
      if (coordinates.Count > 1 && previousLianeSet != null && currentLianeSet.HashKey != previousLianeSet.Value.HashKey)
      {
        if (index < orderedCoordinates.Count - 1 && !orderedCoordinates[index + 1].Equals(cutCoordinate)) coordinates.Add(orderedCoordinates[index + 1]);
        var lianeSegment = new TripSegment(coordinates.ToImmutableList(), previousLianeSet.Value.Trips);
        tripSegments.Add(lianeSegment);
        coordinates.Clear();
      }

      coordinates.Add(coordinate);
      previousLianeSet = currentLianeSet;
    }

    if (coordinates.Count > 1 && previousLianeSet != null)
    {
      var tripSegment = new TripSegment(coordinates.ToImmutableList(), previousLianeSet.Value.Trips);
      tripSegments.Add(tripSegment);
    }

    return tripSegments//.Where(s => s.Coordinates.Count > 1)
      .ToImmutableList();
  }

  internal readonly struct TripSet
  {
    public TripSet(IEnumerable<Ref<Api.Trip.Trip>> trips)
    {
      HashKey = string.Join("_", trips.Select(r => r.Id).Distinct().Order());
    }

    public ImmutableList<Ref<Api.Trip.Trip>> Trips => HashKey.Split("_").Select(id => (Ref<Api.Trip.Trip>)id).ToImmutableList();
    public string HashKey { get; }

    public TripSet Merge(TripSet other)
    {
      return new TripSet(other.Trips.Concat(Trips));
    }
  }
}