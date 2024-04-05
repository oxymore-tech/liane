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
public sealed class MemberPingHandler(
  IMongoDatabase db,
  ICurrentContext currentContext,
  ITripTrackerService tripTrackerService,
  ILogger<MemberPingHandler> logger)
  : IEventListener<TripEvent.MemberPing>
{
  public async Task OnEvent(TripEvent.MemberPing e, Ref<Api.Auth.User>? sender = null)
  {
    var at = DateTimeOffset.FromUnixTimeMilliseconds(e.Timestamp).UtcDateTime;
    var memberId = sender ?? currentContext.CurrentUser().Id;
    var ping = new UserPing(memberId, at, e.Delay ?? TimeSpan.Zero, e.Coordinate);
    var filter = Builders<TripDb>.Filter.Where(l => l.Id == e.Trip)
                 & Builders<TripDb>.Filter.Or(Builders<TripDb>.Filter.Lt(l => l.DepartureTime, DateTime.UtcNow + TimeSpan.FromMinutes(15)),
                   Builders<TripDb>.Filter.Where(l => l.State == TripState.Started))
                 & Builders<TripDb>.Filter.ElemMatch(l => l.Members, m => m.User == memberId);

    var liane = await db.GetCollection<TripDb>()
      .FindOneAndUpdateAsync(filter,
        Builders<TripDb>.Update.AddToSet(l => l.Pings, ping),
        new FindOneAndUpdateOptions<TripDb> { ReturnDocument = ReturnDocument.After }
      );

    if (liane is null)
    {
      throw ResourceNotFoundException.For(e.Trip);
    }

    if (liane.State is not TripState.Started)
    {
      throw new ValidationException(ValidationMessage.LianeStateInvalid(liane.State));
    }

    try
    {
      await tripTrackerService.PushPing(liane.Id, ping);
    }
    catch (Exception)
    {
      logger.LogWarning($"No tracker found for liane {liane.Id}");
    }
  }
}