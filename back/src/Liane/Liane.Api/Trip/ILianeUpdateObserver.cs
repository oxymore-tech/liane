using System.Threading.Tasks;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public interface ILianeUpdateObserver
{
  Task Push(Trip trip, Ref<Auth.User> recipient);
}