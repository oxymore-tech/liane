using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using GeoJSON.Text.Feature;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Geo;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Postgis.Db;
using Liane.Service.Internal.Util.Sql;
using Microsoft.Extensions.Caching.Memory;

namespace Liane.Service.Internal.Trip;

public sealed class RallyingPointServiceImpl(IOsrmService osrmService, PostgisDatabase db) : IRallyingPointService
{
  private static readonly Regex NonAlphanumeric = new("[^a-zA-Z0-9]+");

  private static readonly string[] AccentedChars =
  [
    "[aáÁàÀâÂäÄãÃåÅæÆ]",
    "[cçÇ]",
    "[eéÉèÈêÊëË]",
    "[iíÍìÌîÎïÏ]",
    "[nñÑ]",
    "[oóÓòÒôÔöÖõÕøØœŒß]",
    "[uúÚùÙûÛüÜ]"
  ];

  private readonly MemoryCache pointCache = new(new MemoryCacheOptions());

  public Task<RallyingPoint> Get(Ref<RallyingPoint> reference)
  {
    return pointCache.GetOrCreateAsync(reference, async _ =>
    {
      using var connection = db.NewConnection();
      return await connection.GetAsync(reference);
    })!;
  }

  public async Task<ImmutableDictionary<string, RallyingPoint>> GetMany(ImmutableList<Ref<RallyingPoint>> references)
  {
    using var connection = db.NewConnection();

    var query = Query.Select<RallyingPoint>()
      .Where(Filter<RallyingPoint>.Where(r => r.Id, ComparisonOperator.In, references));
    var results = await connection.QueryAsync(query);
    return results.ToImmutableDictionary(r => r.Id!);
  }

  public async Task<ImmutableDictionary<LatLng, RallyingPoint>> Snap(ImmutableHashSet<LatLng> coordinates, int distanceInMeters = 10000)
  {
    using var connection = db.NewConnection();

    var boundingBox = BoundingBox.From(coordinates).Enlarge(distanceInMeters);

    var query = Query.Select<RallyingPoint>()
      .Where(Filter<RallyingPoint>.Within(r => r.Location, boundingBox));
    var results = await connection.QueryAsync(query);
    foreach (var rallyingPoint in results)
    {
      pointCache.Set(rallyingPoint.Id!, rallyingPoint);
    }

    return RallyingPointExtensions.SnapToClosestPoints(coordinates, results);
  }

  private static Filter<RallyingPoint> GetFilter(RallyingPointFilter rallyingPointFilter)
  {
    var filter = Filter<RallyingPoint>.Empty;

    if (rallyingPointFilter.Search is not null)
    {
      var regex = ToSearchPattern(rallyingPointFilter.Search!);
      filter &= Filter<RallyingPoint>.Regex(r => r.Label, regex)
                | Filter<RallyingPoint>.Regex(r => r.City, regex)
                | Filter<RallyingPoint>.Regex(r => r.ZipCode, regex)
                | Filter<RallyingPoint>.Regex(r => r.Address, regex);
    }

    var center = rallyingPointFilter.GetLatLng();
    if (center.HasValue)
    {
      filter &= Filter<RallyingPoint>.Near(x => x.Location, center.Value, rallyingPointFilter.Distance ?? 500_000);
    }

    if (rallyingPointFilter.Types is not null)
    {
      filter &= Filter<RallyingPoint>.Where(r => r.Type, ComparisonOperator.In, rallyingPointFilter.Types);
    }

    return filter;
  }

  public async Task<PaginatedResponse<RallyingPoint>> List(RallyingPointFilter rallyingPointFilter)
  {
    using var connection = db.NewConnection();
    var filter = GetFilter(rallyingPointFilter);
    var center = rallyingPointFilter.GetLatLng();
    var limit = rallyingPointFilter.Limit ?? 15;
    var offset = rallyingPointFilter.Offset ?? 0;
    var query = Query.Select<RallyingPoint>()
      .Where(filter)
      .Skip(offset)
      .Take(limit);

    if (center.HasValue)
    {
      query = query.OrderBy(rp => rp.Location.Distance(center.Value));
    }

    var total = await connection.CountAsync(Query.Count<RallyingPoint>()
      .Where(filter));
    var results = await connection.QueryAsync(query);
    return new PaginatedResponse<RallyingPoint>(limit, null, results, (int)total);
  }

  private static string ToSearchPattern(string search)
  {
    var words = NonAlphanumeric.Replace(search, ".")
      .Trim()
      .ToLower()
      .Split();

    return string.Concat(words.Select(w =>
    {
      var removeAccent = AccentedChars.Aggregate(w, (current, accentedChar) => Regex.Replace(current, accentedChar, accentedChar));
      return $@"\m{removeAccent}";
    }));
  }

  public async Task<bool> Update(Ref<RallyingPoint> reference, RallyingPoint inputDto)
  {
    using var connection = db.NewConnection();
    var updated = await connection.UpdateAsync(inputDto);
    return updated > 0;
  }

  public async Task<RallyingPoint?> Snap(LatLng position, int radius = 100)
  {
    using var connection = db.NewConnection();
    var query = Query.Select<RallyingPoint>()
      .OrderBy(new FieldDefinition<RallyingPoint>.Distance(FieldDefinition<RallyingPoint>.From(r => r.Location), position))
      .Take(1);
    return await connection.FirstOrDefaultAsync(query);
  }

  public async Task<RallyingPoint?> SnapViaRoute(LatLng position, int radius = 100)
  {
    using var connection = db.NewConnection();
    var query = Query.Select<RallyingPoint>()
      .OrderBy(new FieldDefinition<RallyingPoint>.Distance(FieldDefinition<RallyingPoint>.From(r => r.Location), position))
      .Take(10);
    var list = await connection.QueryAsync(query);

    if (list.Count < 1) return null;

    var table = await osrmService.Table(new List<LatLng> { position }.Concat(list.Select(rp => rp.Location)));
    // Get closest point via road network 
    var closest = list.Select((l, i) => (Point: l, Distance: table.Distances[0][i + 1])).MinBy(r => r.Distance);
    return closest.Distance <= radius ? closest.Point : null;
  }

  public async Task<bool> Delete(Ref<RallyingPoint> reference)
  {
    return await DeleteMany(new[] { reference }) > 0;
  }

  public async Task<RallyingPoint> Create(RallyingPoint obj)
  {
    using var connection = db.NewConnection();
    await connection.MergeAsync(obj);
    return obj;
  }

  public async Task SetActive(IEnumerable<Ref<RallyingPoint>> points, bool active)
  {
    using var connection = db.NewConnection();
    await connection.UpdateAsync(new UpdateQuery<RallyingPoint>(
        Filter<RallyingPoint>.Where(r => r.Id, ComparisonOperator.In, points))
      .Set(r => r.IsActive, active)
    );
  }

  public Task<int> DeleteMany(IEnumerable<Ref<RallyingPoint>> points)
  {
    var idsFilter = Filter<RallyingPoint>.Where(r => r.Id, ComparisonOperator.In, points.Select(p => p.Id));
    return DeleteMany(idsFilter);
  }

  public Task<int> DeleteMany(RallyingPointFilter rallyingPointFilter)
  {
    var filter = GetFilter(rallyingPointFilter);
    return DeleteMany(filter);
  }

  public async Task<RallyingPointStats> GetStats(Ref<RallyingPoint> point)
  {
    try
    {
      using var connection = db.NewConnection();
      return await connection.GetAsync((Ref<RallyingPointStats>)point.Id);
    }
    catch (ResourceNotFoundException)
    {
      return new RallyingPointStats(point.Id, 0, null);
    }
  }

  public async Task<FeatureCollection> GetDepartment(string n)
  {
    using var connection = db.NewConnection();
    var filter = Filter<RallyingPoint>.Where(r => r.ZipCode, ComparisonOperator.Like, $"{n}___");
    var query = Query.Select<RallyingPoint>()
      .Where(filter);
    return await connection.QueryGeoJsonAsync(query);
  }

  private async Task<int> DeleteMany(Filter<RallyingPoint> filter)
  {
    using var connection = db.NewConnection();
    const string usedPointsIds = "select id from rallying_point_stats union select from_id from segment union select to_id from segment";
    var usedPointsFilter = Filter<RallyingPoint>.Where(r => r.Id, ComparisonOperator.Nin, usedPointsIds);
    return await connection.DeleteAsync(filter & usedPointsFilter);
  }

  public async Task UpdateStats(Ref<RallyingPoint> point, DateTime lastUsage, int incUsageCount = 1)
  {
    using var connection = db.NewConnection();
    await connection.UpdateAsync(new UpdateQuery<RallyingPointStats>(Filter<RallyingPointStats>.Where(r => r.Id, ComparisonOperator.Eq, point.Id))
      .Set(r => r.LastTripUsage, lastUsage)
      .Increment(r => r.TotalTripCount, incUsageCount)
    );
  }

  public async Task UpdateStats(IEnumerable<Ref<RallyingPoint>> points, DateTime lastUsage, int incUsageCount = 1)
  {
    using var connection = db.NewConnection();
    using var transaction = connection.BeginTransaction();
    foreach (var point in points)
    {
      await connection.UpdateAsync(new UpdateQuery<RallyingPointStats>(Filter<RallyingPointStats>.Where(r => r.Id, ComparisonOperator.Eq, point.Id))
          .Set(r => r.LastTripUsage, lastUsage)
          .Increment(r => r.TotalTripCount, incUsageCount)
        , transaction);
    }
  }

  public async Task Insert(IEnumerable<RallyingPoint> rallyingPoints, bool clearAll = false)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    if (clearAll)
    {
      await connection.DeleteAsync(Filter<RallyingPointDb>.Empty, tx);
    }

    await connection.MergeMultipleAsync(rallyingPoints.Select(r => new RallyingPointDb(r.Id, r.Label, r.Location, r.Type.ToString(), r.Address, r.ZipCode, r.City, r.PlaceCount, r.IsActive)), tx);

    tx.Commit();
  }

  public async Task ImportCsv(Stream input)
  {
    await db.ImportTableAsCsv<RallyingPoint>(input, c => c.IsActive);
  }

  public async Task ExportCsv(Stream output, RallyingPointFilter rallyingPointFilter)
  {
    var filter = GetFilter(rallyingPointFilter);
    await db.ExportTableAsCsv(output, filter, c => c.IsActive);
  }
}