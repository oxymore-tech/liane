using System.Threading.Tasks;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public interface ILianeUpdateObserver
{
  Task Push(Community.Liane liane, Ref<Auth.User> recipient);
}