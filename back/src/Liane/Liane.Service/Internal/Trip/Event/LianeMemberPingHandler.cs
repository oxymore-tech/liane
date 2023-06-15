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
    var filter = Builders<LianeDb>.Filter.Where(l => l.Id == e.Liane && l.State == LianeState.Started)
                 & Builders<LianeDb>.Filter.ElemMatch(l => l.Members, m => m.User == e.Member);

    var liane = await mongo.GetCollection<LianeDb>()
      .FindOneAndUpdateAsync(filter,
        Builders<LianeDb>.Update.AddToSet(l => l.Pings, new UserPing(e.Member, DateTime.UtcNow, e.Delay, coordinate)),
        new FindOneAndUpdateOptions<LianeDb> { ReturnDocument = ReturnDocument.After }
      );

    // avec la coordonnées du ping, on peut estimer le retard (delay) de cet utilisateur par rapport à l'heure d'arrivée prévue à son prochain point
    // (dépend de si il est conducteur ou passager)
    // on met à jour l'attribut Delay du LianeMember de l'utilisateur
    // passer à l'état finished si le driver ping à proximité de l'arrivée

    if (liane is null)
    {
      return;
    }
  }
}