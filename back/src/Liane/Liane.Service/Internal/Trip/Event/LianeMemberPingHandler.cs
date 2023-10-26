using System;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip.Event;

public sealed class LianeMemberPingHandler : IEventListener<LianeEvent.MemberPing>
{
  private readonly IMongoDatabase mongo;
  private readonly ILianeMemberTracker lianeMemberTracker;
  private readonly ILianeTrackerCache lianeTrackerCache;
  private readonly ICurrentContext currentContext;
  private readonly ILogger<LianeMemberPingHandler> logger;

  public LianeMemberPingHandler(IMongoDatabase db, ILianeMemberTracker lianeMemberTracker, ICurrentContext currentContext, ILogger<LianeMemberPingHandler> logger, ILianeTrackerCache lianeTrackerCache)
  {
    mongo = db;
    this.lianeMemberTracker = lianeMemberTracker;
    this.currentContext = currentContext;
    this.logger = logger;
    this.lianeTrackerCache = lianeTrackerCache;
  }

  public async Task OnEvent(LianeEvent.MemberPing e, Ref<Api.User.User>? sender = null)
  {
    var at = DateTimeOffset.FromUnixTimeMilliseconds(e.Timestamp).UtcDateTime;
    var memberId = sender ?? currentContext.CurrentUser().Id;
    var ping = new UserPing(memberId, at, e.Delay ?? TimeSpan.Zero, e.Coordinate);
    var filter = Builders<LianeDb>.Filter.Where(l => l.Id == e.Liane)
                 & Builders<LianeDb>.Filter.Or(Builders<LianeDb>.Filter.Lt(l => l.DepartureTime, DateTime.UtcNow + TimeSpan.FromMinutes(15)),
                   Builders<LianeDb>.Filter.Where(l => l.State == LianeState.Started))
                 & Builders<LianeDb>.Filter.ElemMatch(l => l.Members, m => m.User == memberId);

    var liane = await mongo.GetCollection<LianeDb>()
      .FindOneAndUpdateAsync(filter,
        Builders<LianeDb>.Update.AddToSet(l => l.Pings, ping),
        new FindOneAndUpdateOptions<LianeDb> { ReturnDocument = ReturnDocument.After }
      );

    if (liane is null)
    {
      throw ResourceNotFoundException.For(e.Liane);
    }

    if (liane.State is not LianeState.Started)
    {
      throw new ValidationException(ValidationMessage.LianeStateInvalid(liane.State));
    }
    
    lianeTrackerCache.Trackers.TryGetValue(liane.Id, out var tracker);
    if (tracker is null)
    {
      logger.LogWarning($"No tracker found for liane {liane.Id}");
      return;
    }
    await tracker.Push(ping);

    // For now we only share position of the driver, and passengers close to the next pickup point
    if (memberId == liane.Driver.User.Id)
    {
      var currentLocation = tracker.GetCurrentMemberLocation(memberId);
      if (currentLocation is not null) await lianeMemberTracker.Push(currentLocation);
    }
    else // disable for now : if (tracker.IsCloseToPickup(memberId))
    {
      var currentLocation = tracker.GetCurrentMemberLocation(memberId);
      if (currentLocation is not null) await lianeMemberTracker.Push(currentLocation);
    }
  }
}