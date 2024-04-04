using System;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Trip.Geolocation;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip.Event;

// ReSharper disable once UnusedType.Global
// Autodiscovered by DI
public sealed class LianeMemberPingHandler(
  IMongoDatabase db,
  ICurrentContext currentContext,
  ILianeTrackerService lianeTrackerService,
  ILogger<LianeMemberPingHandler> logger)
  : IEventListener<LianeEvent.MemberPing>
{
  public async Task OnEvent(LianeEvent.MemberPing e, Ref<Api.Auth.User>? sender = null)
  {
    var at = DateTimeOffset.FromUnixTimeMilliseconds(e.Timestamp).UtcDateTime;
    var memberId = sender ?? currentContext.CurrentUser().Id;
    var ping = new UserPing(memberId, at, e.Delay ?? TimeSpan.Zero, e.Coordinate);
    var filter = Builders<LianeDb>.Filter.Where(l => l.Id == e.Liane)
                 & Builders<LianeDb>.Filter.Or(Builders<LianeDb>.Filter.Lt(l => l.DepartureTime, DateTime.UtcNow + TimeSpan.FromMinutes(15)),
                   Builders<LianeDb>.Filter.Where(l => l.State == LianeState.Started))
                 & Builders<LianeDb>.Filter.ElemMatch(l => l.Members, m => m.User == memberId);

    var liane = await db.GetCollection<LianeDb>()
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

    try
    {
      await lianeTrackerService.PushPing(liane.Id, ping);
    }
    catch (Exception)
    {
      logger.LogWarning($"No tracker found for liane {liane.Id}");
    }
  }
}