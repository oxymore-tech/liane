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
    var cutCoordinate = new LngLatTuple(-1, -1);
    var groupedCoordinates = new Dictionary<LngLatTuple, LianeSet>();
    var orderedCoordinates = new List<LngLatTuple>();
    foreach (var lianeSegment in raw)
    {
      var lianeSet = new LianeSet(lianeSegment.Lianes.ToHashSet());
      foreach (var coordinate in lianeSegment.Coordinates)
      {
        if (groupedCoordinates.TryGetValue(coordinate, out var currentLianeSet))
        {
          groupedCoordinates[coordinate] = lianeSet.Merge(currentLianeSet);
          orderedCoordinates.Add(cutCoordinate);
        }
        else
        {
          groupedCoordinates[coordinate] = lianeSet;
          orderedCoordinates.Add(coordinate);
        }
      }
    }

    var lianeSegments = new List<LianeSegment>();
    var coordinates = new List<LngLatTuple>();
    LianeSet? previousLianeSet = null;
    foreach (var coordinate in orderedCoordinates)
    {
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
      if (previousLianeSet != null && currentLianeSet.HashKey != previousLianeSet.Value.HashKey)
      {
        var lianeSegment = new LianeSegment(coordinates.ToImmutableList(), previousLianeSet.Value.Lianes);
        lianeSegments.Add(lianeSegment);
        coordinates.Clear();
      }

      coordinates.Add(coordinate);
      previousLianeSet = currentLianeSet;
    }

    if (coordinates.Count > 0 && previousLianeSet != null)
    {
      var lianeSegment = new LianeSegment(coordinates.ToImmutableList(), previousLianeSet.Value.Lianes);
      lianeSegments.Add(lianeSegment);
    }

    return lianeSegments.Where(s => s.Coordinates.Count > 1)
      .ToImmutableList();
  }

  internal readonly struct LianeSet
  {
    public LianeSet(IEnumerable<Ref<Api.Trip.Liane>> lianes)
    {
      HashKey = string.Join("_", lianes.Select(r => r.Id).Distinct().Order());
    }

    public ImmutableList<Ref<Api.Trip.Liane>> Lianes => HashKey.Split("_").Select(id => (Ref<Api.Trip.Liane>)id).ToImmutableList();
    public string HashKey { get; }

    public LianeSet Merge(LianeSet other)
    {
      return new LianeSet(other.Lianes.Concat(Lianes));
    }
  }
}