using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Exception;
using Liane.Service.Internal.Mongo;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip.Event;

public sealed class LianeMemberPingHandler : IEventListener<LianeEvent.MemberPing>
{
  private readonly IMongoDatabase mongo;
  private readonly IRoutingService routingService;

  public LianeMemberPingHandler(IMongoDatabase db, IRoutingService routingService)
  {
    mongo = db;
    this.routingService = routingService;
  }

  public async Task OnEvent(Api.Event.Event e, LianeEvent.MemberPing memberPing, Api.Event.Event? answersToEvent)
  {
    var coordinate = await memberPing.Coordinate.GetOrDefault(async l => await routingService.SnapToRoad(l));
    var filter = Builders<LianeDb>.Filter.Where(l => l.Id == memberPing.Liane && l.State == LianeState.NotStarted | l.State == LianeState.Started)
                 & Builders<LianeDb>.Filter.ElemMatch(l => l.Members, m => m.User == e.CreatedBy);
    
    var liane = await mongo.GetCollection<LianeDb>()
      .FindOneAndUpdateAsync(filter,
        Builders<LianeDb>.Update.AddToSet(l => l.Pings, new UserPing(e.CreatedBy, e.CreatedAt!.Value, memberPing.Delay, coordinate))
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