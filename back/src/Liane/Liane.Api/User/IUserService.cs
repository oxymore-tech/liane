using System;
using System.Threading.Tasks;

namespace Liane.Api.User;

public interface IUserService
{
  Task<User> UpdateLastConnection(string id, DateTime timestamp);
  Task<User> Get(string id);
  Task<User> GetByPhone(string phone);
}