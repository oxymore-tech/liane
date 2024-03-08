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
  public static ImmutableList<LianeSegment> TruncateOverlappingSegments(ImmutableList<LianeSegment> raw)
  {
    var cutCoordinate = new LngLatTuple(-1000, -1000);
    var groupedCoordinates = new Dictionary<LngLatTuple, LianeSet>();
    var orderedCoordinates = new List<LngLatTuple>();
    foreach (var lianeSegment in raw)
    {
      orderedCoordinates.Add(cutCoordinate);
      var lianeSet = new LianeSet(lianeSegment.Lianes.ToHashSet());
      for (var index = 0; index < lianeSegment.Coordinates.Count; index++)
      {
        var coordinate = lianeSegment.Coordinates[index];
        if (groupedCoordinates.TryGetValue(coordinate, out var currentLianeSet))
        {
          groupedCoordinates[coordinate] = lianeSet.Merge(currentLianeSet);
          if (!orderedCoordinates.Last().Equals(cutCoordinate))
          {
            if (index < lianeSegment.Coordinates.Count-1) orderedCoordinates.Add(lianeSegment.Coordinates[index+1]);
            orderedCoordinates.Add(cutCoordinate);
          }
        }
        else
        {
          groupedCoordinates[coordinate] = lianeSet;
          if (index > 0 && orderedCoordinates.Last().Equals(cutCoordinate))orderedCoordinates.Add(lianeSegment.Coordinates[index-1]);
          orderedCoordinates.Add(coordinate);
        }
      }
    }

    var lianeSegments = new List<LianeSegment>();
    var coordinates = new List<LngLatTuple>();
    LianeSet? previousLianeSet = null;
    for (var index = 0; index < orderedCoordinates.Count; index++)
    {
      var coordinate = orderedCoordinates[index];
      if (coordinate.Equals(cutCoordinate))
      {
        // Special case the route is already truncated because is crossing another route
        if (previousLianeSet != null)
        {
          var lianeSegment = new LianeSegment(coordinates.ToImmutableList(), previousLianeSet.Value.Lianes);
          lianeSegments.Add(lianeSegment);
        }

        coordinates.Clear();
        previousLianeSet = null;
        continue;
      }

      var currentLianeSet = groupedCoordinates[coordinate];
      if (coordinates.Count > 1 && previousLianeSet != null && currentLianeSet.HashKey != previousLianeSet.Value.HashKey)
      {
        if (index < orderedCoordinates.Count - 1 && !orderedCoordinates[index + 1].Equals(cutCoordinate)) coordinates.Add(orderedCoordinates[index + 1]);
        var lianeSegment = new LianeSegment(coordinates.ToImmutableList(), previousLianeSet.Value.Lianes);
        lianeSegments.Add(lianeSegment);
        coordinates.Clear();
      }

      coordinates.Add(coordinate);
      previousLianeSet = currentLianeSet;
    }

    if (coordinates.Count > 1 && previousLianeSet != null)
    {
      var lianeSegment = new LianeSegment(coordinates.ToImmutableList(), previousLianeSet.Value.Lianes);
      lianeSegments.Add(lianeSegment);
    }

    return lianeSegments//.Where(s => s.Coordinates.Count > 1)
      .ToImmutableList();
  }

  internal readonly struct LianeSet
  {
    public LianeSet(IEnumerable<Ref<Api.Trip.Trip>> lianes)
    {
      HashKey = string.Join("_", lianes.Select(r => r.Id).Distinct().Order());
    }

    public ImmutableList<Ref<Api.Trip.Trip>> Lianes => HashKey.Split("_").Select(id => (Ref<Api.Trip.Trip>)id).ToImmutableList();
    public string HashKey { get; }

    public LianeSet Merge(LianeSet other)
    {
      return new LianeSet(other.Lianes.Concat(Lianes));
    }
  }
}