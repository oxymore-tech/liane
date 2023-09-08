using System.Threading.Tasks;

namespace Liane.Api.User;

public interface IDeleteAccountService
{
  Task DeleteCurrent();
}