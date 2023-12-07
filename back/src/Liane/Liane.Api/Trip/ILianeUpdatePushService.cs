using System.Threading.Tasks;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public interface ILianeUpdatePushService
{
  Task<TrackedMemberLocation?> Subscribe(Ref<User.User> user, Ref<Liane> liane, Ref<User.User> member);
  
  Task Unsubscribe(Ref<User.User> user, Ref<Liane> liane, Ref<User.User> member);
  
  Task Push(TrackedMemberLocation update);
}