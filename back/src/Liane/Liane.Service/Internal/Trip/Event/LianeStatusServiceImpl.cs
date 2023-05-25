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

  public async Task<LianeStatus> GetStatus(Api.Trip.Liane liane, ImmutableList<UserPing> pings)
  {
    var now = DateTime.UtcNow;

    return liane.State switch
    {
      LianeState.NotStarted => await ComputeNotStartedStatus(liane, now),
      LianeState.Started => await ComputeStartedStatus(liane, pings, now),
      _ => ComputeStatus(liane, now)
    };
  }

  private static LianeStatus ComputeStatus(Api.Trip.Liane liane, DateTime now)
  {
    return new LianeStatus(now, liane.State, null, ImmutableHashSet<Ref<Api.User.User>>.Empty, ImmutableDictionary<Ref<Api.User.User>, PassengerStatus>.Empty);
  }

  private static Task<LianeStatus> ComputeStartedStatus(Api.Trip.Liane liane, ImmutableList<UserPing> pings, DateTime now)
  {
    var carpoolers = pings.Where(p => p.User == liane.Driver.User)
      .Select(p => p.User)
      .ToImmutableHashSet();

    var nextEta = liane.WayPoints
      .Select(w => new NextEta(w.RallyingPoint, liane.DepartureTime.AddSeconds(w.Duration)))
      .FirstOrDefault(e => e.Eta > now);

    return Task.FromResult(new LianeStatus(now, liane.State, nextEta, carpoolers, ImmutableDictionary<Ref<Api.User.User>, PassengerStatus>.Empty));
  }

  private async Task<LianeStatus> ComputeNotStartedStatus(Api.Trip.Liane liane, DateTime now)
  {
    var nextEta = liane.WayPoints
      .Select(w => new NextEta(w.RallyingPoint, liane.DepartureTime.AddSeconds(w.Duration)))
      .FirstOrDefault(e => e.Eta > now);

    if (nextEta is not null)
    {
      return new LianeStatus(now, liane.State, nextEta, ImmutableHashSet<Ref<Api.User.User>>.Empty, ImmutableDictionary<Ref<Api.User.User>, PassengerStatus>.Empty);
    }

    await mongo.GetCollection<LianeDb>()
      .UpdateOneAsync(l => l.Id == liane.Id, Builders<LianeDb>.Update.Set(l => l.State, LianeState.Canceled));
    return new LianeStatus(now, LianeState.Canceled, null, ImmutableHashSet<Ref<Api.User.User>>.Empty, ImmutableDictionary<Ref<Api.User.User>, PassengerStatus>.Empty);
  }
}