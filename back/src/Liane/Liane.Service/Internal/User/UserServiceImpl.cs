using System;
using System.Threading.Tasks;
using Liane.Api.User;
using Liane.Api.Util.Exception;
using Liane.Service.Internal.Mongo;
using MongoDB.Driver;

namespace Liane.Service.Internal.User;

public sealed class UserServiceImpl : BaseMongoCrudService<DbUser, Api.User.User>, IUserService
{
  public UserServiceImpl(IMongoDatabase mongo) : base(mongo)
  {
  }

  public async Task UpdateLastConnection(string id, DateTime timestamp)
  {
    await Mongo.GetCollection<DbUser>()
      .UpdateOneAsync(
        u => u.Id == id,
        Builders<DbUser>.Update.Set(u => u.LastConnection, timestamp)
      );
  }

  public async Task<FullUser> GetByPhone(string phone)
  {
    var phoneNumber = phone.ToPhoneNumber();

    var number = phoneNumber.ToString();

    var dbUser = await Mongo.GetCollection<DbUser>()
      .Find(u => u.Phone == number)
      .FirstOrDefaultAsync();

    if (dbUser is null)
    {
      throw new ResourceNotFoundException($"User ${phoneNumber}");
    }

    return MapUser(dbUser);
  }

  public async Task<FullUser> GetFullUser(string userId)
  {
    var userDb = await ResolveRef<DbUser>(userId);
    if (userDb is null)
    {
      throw new ResourceNotFoundException($"User ${userId}");
    }

    return MapUser(userDb);
  }

  private FullUser MapUser(DbUser dbUser)
  {
    return new FullUser(dbUser.Id, dbUser.Phone, dbUser.Pseudo, dbUser.PushToken, dbUser.CreatedAt);
  }

  protected override Task<Api.User.User> MapEntity(DbUser dbUser)
  {
    return Task.FromResult(new Api.User.User(dbUser.Id, dbUser.Pseudo, dbUser.CreatedAt));
  }
}