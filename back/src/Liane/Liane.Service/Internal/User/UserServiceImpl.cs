using System;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Liane.Api.User;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using MongoDB.Driver;

namespace Liane.Service.Internal.User;

public sealed class UserServiceImpl : BaseMongoCrudService<DbUser, Api.User.User>, IUserService
{
  public UserServiceImpl(IMongoDatabase mongo) : base(mongo)
  {
  }

  public override async Task<Api.User.User> Get(Ref<Api.User.User> reference)
  {
    try
    {
      return await base.Get(reference);
    }
    catch (ResourceNotFoundException)
    {
      return FullUser.Unknown(reference);
    }
  }

  public async Task UpdateAvatar(string id, string picturelUrl)
  {
    await UpdateField(id, u => u.UserInfo!.PictureUrl, picturelUrl);
  }

  public async Task UpdateLastConnection(string id, DateTime timestamp)
  {
    await UpdateField(id, u => u.LastConnection, timestamp);
  }

  public async Task UpdatePushToken(string id, string pushToken)
  {
    await UpdateField(id, u => u.PushToken, pushToken);
  }

  public async Task<FullUser> UpdateInfo(string id, UserInfo info)
  {
    const int minLength = 2;
    if (info.FirstName.Length < minLength) throw new ValidationException(nameof(UserInfo.FirstName), ValidationMessage.TooShort(minLength));
    if (info.LastName.Length < minLength) throw new ValidationException(nameof(UserInfo.LastName), ValidationMessage.TooShort(minLength));

    await Mongo.GetCollection<DbUser>()
      .UpdateOneAsync(
        u => u.Id == id,
        Builders<DbUser>.Update.Set(i => i.UserInfo!.FirstName, info.FirstName)
          .Set(i => i.UserInfo!.LastName, info.LastName)
          .Set(i => i.UserInfo!.Gender, info.Gender)
      );
    return await GetFullUser(id);
  }

  public async Task<bool> IsSignedUp(string phone)
  {
    var phoneNumber = phone.ToPhoneNumber();

    var number = phoneNumber.ToString();

    var dbUser = await Mongo.GetCollection<DbUser>()
      .Find(u => u.Phone == number)
      .FirstOrDefaultAsync();

    if (dbUser is null)
    {
      return false;
    }

    return dbUser.UserInfo is not null;
  }

  public async Task<FullUser> GetFullUser(string userId)
  {
    var userDb = await Mongo.Get<DbUser>(userId);
    return userDb is null
      ? FullUser.Unknown(userId)
      : MapUser(userDb);
  }

  public async Task<FullUser?> TryGetFullUser(string userId)
  {
    var userDb = await Mongo.Get<DbUser>(userId);
    return userDb is not null ? MapUser(userDb) : null;
  }

  public Task Delete(string id)
  {
    return Mongo.GetCollection<DbUser>()
      .DeleteOneAsync(u => u.Id == id);
  }

  private static FullUser MapUser(DbUser dbUser)
  {
    var info = dbUser.UserInfo ?? new UserInfo("Utilisateur Inconnu", "", null, Gender.Unspecified);
    return new FullUser(dbUser.Id, dbUser.Phone, dbUser.CreatedAt, info.FirstName, info.LastName, info.Gender, dbUser.Stats, info.PictureUrl, dbUser.PushToken);
  }

  protected override Task<Api.User.User> MapEntity(DbUser dbUser)
  {
    return Task.FromResult(new Api.User.User(dbUser.Id, dbUser.CreatedAt, FullUser.GetPseudo(dbUser.UserInfo?.FirstName, dbUser.UserInfo?.LastName), dbUser.UserInfo?.Gender ?? Gender.Unspecified,
      dbUser.UserInfo?.PictureUrl, dbUser.Stats));
  }

  private async Task UpdateField<T>(string userId, Expression<Func<DbUser, T>> field, T value)
  {
    await Mongo.GetCollection<DbUser>()
      .UpdateOneAsync(
        u => u.Id == userId,
        Builders<DbUser>.Update.Set(field, value)
      );
  }
}