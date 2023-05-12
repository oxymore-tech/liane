using System;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip.Event;

public sealed class LianeStatusServiceImpl
{
  private readonly IMongoDatabase mongo;

  public LianeStatusServiceImpl(IMongoDatabase mongo)
  {
    this.mongo = mongo;
  }

  public async Task<LianeStatus> GetStatus(LianeDb lianeDb)
  {
    var now = DateTime.UtcNow;

    return lianeDb.State switch
    {
      LianeState.NotStarted => await ComputeNotStartedStatus(lianeDb, now),
      LianeState.Started => await ComputeStartedStatus(lianeDb, now),
      _ => ComputeStatus(lianeDb, now)
    };
  }

  private static LianeStatus ComputeStatus(LianeDb lianeDb, DateTime now)
  {
    return new LianeStatus(now, lianeDb.State, null, ImmutableHashSet<Ref<Api.User.User>>.Empty, lianeDb.DepartureTime, ImmutableDictionary<Ref<Api.User.User>, PassengerStatus>.Empty);
  }

  private Task<LianeStatus> ComputeStartedStatus(LianeDb lianeDb, DateTime now)
  {
    var carpoolers = lianeDb.Pings.Where(p => p.User == lianeDb.Driver.User)
      .Select(p => p.User)
      .ToImmutableHashSet();
    // TODO find last point based on time interpolation on waypoints
    return Task.FromResult(new LianeStatus(now, lianeDb.State, null, carpoolers, lianeDb.DepartureTime, ImmutableDictionary<Ref<Api.User.User>, PassengerStatus>.Empty));
  }

  private async Task<LianeStatus> ComputeNotStartedStatus(LianeDb lianeDb, DateTime now)
  {
    var delay = lianeDb.DepartureTime - now;

    if (delay < TimeSpan.Zero)
    {
      return new LianeStatus(now, lianeDb.State, null, ImmutableHashSet<Ref<Api.User.User>>.Empty, lianeDb.DepartureTime + delay, ImmutableDictionary<Ref<Api.User.User>, PassengerStatus>.Empty);
    }

    if (delay <= TimeSpan.FromHours(1))
    {
      return new LianeStatus(now, lianeDb.State, null, ImmutableHashSet<Ref<Api.User.User>>.Empty, lianeDb.DepartureTime, ImmutableDictionary<Ref<Api.User.User>, PassengerStatus>.Empty);
    }

    await mongo.GetCollection<LianeDb>()
      .UpdateOneAsync(l => l.Id == lianeDb.Id, Builders<LianeDb>.Update.Set(l => l.State, LianeState.Canceled));
    return new LianeStatus(now, LianeState.Canceled, null, ImmutableHashSet<Ref<Api.User.User>>.Empty, lianeDb.DepartureTime, ImmutableDictionary<Ref<Api.User.User>, PassengerStatus>.Empty);
  }
}