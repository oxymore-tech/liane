using System;
using System.Threading.Tasks;
using Liane.Api.Util.Http;

namespace Liane.Api.Auth;

public interface IUserService : IResourceResolverService<User>
{
  Task UpdateAvatar(string id, string picturelUrl);
  Task UpdateLastConnection(string id, DateTime timestamp);
  Task UpdatePushToken(string id, string pushToken);
  Task<FullUser> UpdateInfo(string id, UserInfo info);
  Task<bool> IsSignedUp(string phone);
  Task<FullUser> GetFullUser(string userId);
  Task<FullUser?> TryGetFullUser(string userId);
  Task Delete(string id);
}