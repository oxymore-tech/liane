using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

public sealed class LianeStatusServiceImpl : ILianeStatusService
{
  private readonly IMongoDatabase mongo;

  public LianeStatusServiceImpl(IMongoDatabase mongo)
  {
    this.mongo = mongo;
  }

  public async Task<LianeStatus> GetStatus(string id)
  {
    var lianeDb = await mongo.GetCollection<LianeDb>()
      .Find(l => l.Id == id)
      .FirstOrDefaultAsync();

    if (lianeDb is null)
    {
      throw ResourceNotFoundException.For((Ref<Api.Trip.Liane>)id);
    }

    var now = DateTime.UtcNow;

    return lianeDb.State switch
    {
      LianeState.NotStarted => await ComputeNotStartedStatus(lianeDb, now),
      LianeState.Started => await ComputeStartedStatus(lianeDb, now),
      LianeState.Canceled => ComputeCanceledStatus(lianeDb, now),
      LianeState.Finished => ComputeFinishedStatus(lianeDb, now),
      _ => throw new ArgumentOutOfRangeException($"Status {lianeDb.State} not supported")
    };
  }

  private LianeStatus ComputeFinishedStatus(LianeDb lianeDb, DateTime now)
  {
    return new LianeStatus(now, LianeState.Finished, null, ImmutableHashSet<Ref<Api.User.User>>.Empty, lianeDb.DepartureTime, ImmutableDictionary<Ref<Api.User.User>, PassengerStatus>.Empty);
  }

  private LianeStatus ComputeCanceledStatus(LianeDb lianeDb, DateTime now)
  {
    return new LianeStatus(now, LianeState.Canceled, null, ImmutableHashSet<Ref<Api.User.User>>.Empty, lianeDb.DepartureTime, ImmutableDictionary<Ref<Api.User.User>, PassengerStatus>.Empty);
  }

  private Task<LianeStatus> ComputeStartedStatus(LianeDb lianeDb, DateTime now)
  {
    throw new NotImplementedException();
  }

  private async Task<LianeStatus> ComputeNotStartedStatus(LianeDb lianeDb, DateTime now)
  {
    var delay = lianeDb.DepartureTime - now;
    if (delay <= TimeSpan.FromHours(1))
    {
      return new LianeStatus(now, lianeDb.State, null, ImmutableHashSet<Ref<Api.User.User>>.Empty, lianeDb.DepartureTime + delay, ImmutableDictionary<Ref<Api.User.User>, PassengerStatus>.Empty);
    }

    await mongo.GetCollection<LianeDb>()
      .UpdateOneAsync(l => l.Id == lianeDb.Id, Builders<LianeDb>.Update.Set(l => l.State, LianeState.Canceled));
    return new LianeStatus(now, LianeState.Canceled, null, ImmutableHashSet<Ref<Api.User.User>>.Empty, lianeDb.DepartureTime, ImmutableDictionary<Ref<Api.User.User>, PassengerStatus>.Empty);
  }
}