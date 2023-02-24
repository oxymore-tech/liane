using System;
using System.Threading.Tasks;
using Liane.Api.Util.Http;

namespace Liane.Api.User;

public interface IUserService : IResourceResolverService<User>
{
  Task UpdateLastConnection(string id, DateTime timestamp);
  Task<FullUser> GetByPhone(string phone);
  Task<FullUser> GetFullUser(string userId);
}