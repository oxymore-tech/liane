using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Postgis.Db;
using Liane.Service.Internal.Util.Sql;
using Microsoft.Extensions.Caching.Memory;

namespace Liane.Service.Internal.Trip;

public sealed class RallyingPointServiceImpl : IRallyingPointService
{
  private static readonly Regex NonAlphanumeric = new("[^a-zA-Z0-9]+");

  private static readonly string[] AccentedChars =
  {
    "[aáÁàÀâÂäÄãÃåÅæÆ]",
    "[cçÇ]",
    "[eéÉèÈêÊëË]",
    "[iíÍìÌîÎïÏ]",
    "[nñÑ]",
    "[oóÓòÒôÔöÖõÕøØœŒß]",
    "[uúÚùÙûÛüÜ]"
  };

  private readonly MemoryCache pointCache = new(new MemoryCacheOptions());
  private readonly IOsrmService osrmService;
  private readonly PostgisDatabase db;

  public RallyingPointServiceImpl(IOsrmService osrmService, PostgisDatabase db)
  {
    this.osrmService = osrmService;
    this.db = db;
  }

  public Task<RallyingPoint> Get(Ref<RallyingPoint> reference)
  {
    return pointCache.GetOrCreateAsync(reference, async _ =>
    {
      using var connection = db.NewConnection();
      return await connection.GetAsync(reference);
    })!;
  }

  public Task<Dictionary<string, RallyingPoint>> GetMany(ImmutableList<Ref<RallyingPoint>> references)
  {
    throw new NotImplementedException();
  }

  public async Task<ImmutableList<RallyingPoint>> List(LatLng? center, int? distance = null, string? search = null, int? limit = null)
  {
    var filter = Filter<RallyingPoint>.Empty;

    if (search is not null)
    {
      var regex = ToSearchPattern(search);
      filter &= Filter<RallyingPoint>.Regex(r => r.Label, regex)
                | Filter<RallyingPoint>.Regex(r => r.City, regex)
                | Filter<RallyingPoint>.Regex(r => r.ZipCode, regex)
                | Filter<RallyingPoint>.Regex(r => r.Address, regex);
    }

    if (center.HasValue)
    {
      filter &= Filter<RallyingPoint>.Near(x => x.Location, center.Value, distance ?? 500_000);
    }

    using var connection = db.NewConnection();

    var query = Query.Select<RallyingPoint>()
      .Where(filter)
      .Take(limit);

    if (center.HasValue)
    {
      query = query.OrderBy(rp => rp.Location.Distance(center.Value));
    }

    return await connection.QueryAsync(query);
  }

  private static string ToSearchPattern(string search)
  {
    var words = NonAlphanumeric.Replace(search, " ")
      .Trim()
      .ToLower()
      .Split();

    return string.Concat(words.Select(w =>
    {
      var removeAccent = AccentedChars.Aggregate(w, (current, accentedChar) => Regex.Replace(current, accentedChar, accentedChar));
      return $@"\m{removeAccent}.*";
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
      .OrderBy(new FieldDefinition<RallyingPoint>.Distance(FieldDefinition<RallyingPoint>.From(r => r.Location), position));
    return await connection.FirstOrDefaultAsync(query);
  }

  public async Task<RallyingPoint?> SnapViaRoute(LatLng position, int radius = 100)
  {
    using var connection = db.NewConnection();
    var query = Query.Select<RallyingPoint>()
      .OrderBy(new FieldDefinition<RallyingPoint>.Distance(FieldDefinition<RallyingPoint>.From(r => r.Location), position));
    var list = await connection.QueryAsync(query);

    if (list.Count < 1) return null;

    var table = await osrmService.Table(new List<LatLng> { position }.Concat(list.Select(rp => rp.Location)));
    // Get closest point via road network 
    var closest = list.Select((l, i) => (Point: l, Distance: table.Distances[0][i + 1])).MinBy(r => r.Distance);
    return closest.Distance <= radius ? closest.Point : null;
  }

  public Task<bool> Delete(Ref<RallyingPoint> reference)
  {
    throw new NotImplementedException();
  }

  public Task<RallyingPoint> Create(RallyingPoint obj)
  {
    throw new NotImplementedException();
  }

  public async Task Insert(IEnumerable<RallyingPoint> rallyingPoints, bool clearAll = false)
  {
    using var connection = db.NewConnection();
    using var tx = connection.BeginTransaction();

    if (clearAll)
    {
      await connection.DeleteAsync(Filter<RallyingPoint>.Empty, tx);
    }

    await connection.InsertMultipleAsync(rallyingPoints, tx);

    tx.Commit();
  }
}