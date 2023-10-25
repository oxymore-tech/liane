
using System.Threading.Tasks;
using Liane.Api.User;
using Liane.Service.Internal.Event;
using Liane.Service.Internal.Mongo;
using MongoDB.Driver;

namespace Liane.Service.Internal.User;

public class UserStatServiceImpl : IUserStatService
{
  private readonly IMongoDatabase mongo;
  private readonly IHubService hubService;
  private readonly IUserService userService;
  
  public UserStatServiceImpl(IMongoDatabase mongo, IHubService hubService, IUserService userService)
  {
    this.mongo = mongo;
    this.hubService = hubService;
    this.userService = userService;
  }

  public async Task IncrementTotalTrips(string userId, int totalSavedEmissions)
  {
    await mongo.GetCollection<DbUser>()
      .UpdateOneAsync(
        u => u.Id == userId,
        Builders<DbUser>.Update.Inc(u => u.Stats.TotalTrips, 1)
      );
    await hubService.PushUserUpdate(await userService.GetFullUser(userId));
  }
  
  public async Task IncrementTotalCreatedTrips(string userId)
  {
    await mongo.GetCollection<DbUser>()
      .UpdateOneAsync(
        u => u.Id == userId,
        Builders<DbUser>.Update.Inc(u => u.Stats.TotalCreatedTrips, 1)
      );
    await hubService.PushUserUpdate(await userService.GetFullUser(userId));
  }
  
  public async Task IncrementTotalJoinedTrips(string userId)
  {
    await mongo.GetCollection<DbUser>()
      .UpdateOneAsync(
        u => u.Id == userId,
        Builders<DbUser>.Update.Inc(u => u.Stats.TotalJoinedTrips, 1)
      );
    await hubService.PushUserUpdate(await userService.GetFullUser(userId));
  }

}