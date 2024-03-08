using System.Threading.Tasks;

namespace Liane.Api.Auth;

public interface IDeleteAccountService
{
  Task DeleteCurrent();
}