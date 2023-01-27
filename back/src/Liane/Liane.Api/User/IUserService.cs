using System.Threading.Tasks;

namespace Liane.Api.User;

public interface IUserService
{
  Task<User> Get(string id);
  Task<User> GetByPhone(string phone);
}