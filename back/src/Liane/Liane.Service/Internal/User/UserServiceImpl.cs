using System.Threading.Tasks;
using Liane.Api.User;
using Liane.Api.Util.Exception;
using Liane.Service.Internal.Mongo;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.Internal.User;

public sealed class UserServiceImpl : IUserService
{
  private readonly IMongoDatabase mongo;

  public UserServiceImpl(MongoSettings mongoSettings)
  {
    mongo = mongoSettings.GetDatabase();
  }

  public async Task<Api.User.User> Get(string id)
  {
    var dbUser = await mongo.GetCollection<DbUser>()
      .Find(u => u.Id == new ObjectId(id))
      .FirstOrDefaultAsync();

    if (dbUser is null)
    {
      throw new ResourceNotFoundException($"User ${id}");
    }

    return MapUser(dbUser);
  }

  public async Task<Api.User.User> GetByPhone(string phone)
  {
    var phoneNumber = phone.ToPhoneNumber();

    var number = phoneNumber.ToString();

    var dbUser = await mongo.GetCollection<DbUser>()
      .Find(u => u.Phone == number)
      .FirstOrDefaultAsync();

    if (dbUser is null)
    {
      throw new ResourceNotFoundException($"User ${phoneNumber}");
    }

    return MapUser(dbUser);
  }

  private static Api.User.User MapUser(DbUser dbUser)
  {
    return new Api.User.User(dbUser.Id.ToString(), dbUser.Phone, dbUser.Pseudo, dbUser.PushToken, null, dbUser.CreatedAt);
  }
}