using System;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Exception;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Osrm;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip.Event;

public sealed class LianeMemberPingHandler : IEventListener<LianeEvent.MemberPing>
{
  private readonly IMongoDatabase mongo;
  private readonly IOsrmService routingService;

  public LianeMemberPingHandler(IMongoDatabase db, IOsrmService routingService)
  {
    mongo = db;
    this.routingService = routingService;
  }

  public async Task OnEvent(LianeEvent.MemberPing e)
  {
    var coordinate = await e.Coordinate.GetOrDefault(async l => await routingService.Nearest(l));
    var filter = Builders<LianeDb>.Filter.Where(l => l.Id == e.Liane && l.State == LianeState.NotStarted | l.State == LianeState.Started)
                 & Builders<LianeDb>.Filter.ElemMatch(l => l.Members, m => m.User == e.Member);

    var liane = await mongo.GetCollection<LianeDb>()
      .FindOneAndUpdateAsync(filter,
        Builders<LianeDb>.Update.AddToSet(l => l.Pings, new UserPing(e.Member, DateTime.UtcNow, e.Delay, coordinate))
          .Set(l => l.State, LianeState.Started)
          .Set(l => l.Geometry, null),
        new FindOneAndUpdateOptions<LianeDb> { ReturnDocument = ReturnDocument.After }
      );

    if (liane is null)
    {
      throw new ResourceNotFoundException("Liane or member not found");
    }
  }
}