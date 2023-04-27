using System;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Liane.Api.User;
using Liane.Api.Util.Exception;
using Liane.Service.Internal.Mongo;
using Microsoft.Extensions.Logging.Abstractions;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.Internal.User;

public sealed class UserServiceImpl : BaseMongoCrudService<DbUser, Api.User.User>, IUserService
{
  public UserServiceImpl(IMongoDatabase mongo) : base(mongo)
  {
  }

  private async Task UpdateField<T>(string userId, Expression<Func<DbUser, T>> field, T value)
  {
    await Mongo.GetCollection<DbUser>()
      .UpdateOneAsync(
        u => u.Id == userId,
        Builders<DbUser>.Update.Set(field, value)
      );
  }

  public async Task UpdateLastConnection(string id, DateTime timestamp)
  {
    await UpdateField(id, u => u.LastConnection, timestamp);
  }

  public async Task UpdatePushToken(string id, string pushToken)
  {
    await UpdateField(id, u => u.PushToken, pushToken);
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
    var userDb = await Mongo.Get<DbUser>(userId);
    if (userDb is null)
    {
      throw new ResourceNotFoundException($"User ${userId}");
    }

    return MapUser(userDb);
  }

  private static FullUser MapUser(DbUser dbUser)
  {
    return new FullUser(dbUser.Id, dbUser.Phone, dbUser.CreatedAt, "" , "", Gender.Unspecified, null, dbUser.PushToken);
  }

  protected override Task<Api.User.User> MapEntity(DbUser dbUser)
  {
    return Task.FromResult(new Api.User.User(dbUser.Id, dbUser.CreatedAt, "Utilisateur " + ObjectId.Parse(dbUser.Id).Increment, Gender.Unspecified, null));
  }
}