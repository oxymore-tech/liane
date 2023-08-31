using System.Threading.Tasks;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public interface ILianeUpdateObserver
{
  Task Push(Liane liane, Ref<User.User> recipient);
}