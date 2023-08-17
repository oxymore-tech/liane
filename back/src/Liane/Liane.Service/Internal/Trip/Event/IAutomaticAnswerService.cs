using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Trip.Event;

public interface IAutomaticAnswerService
{
  Task<bool> TryAcceptRequest(LianeEvent.JoinRequest joinRequest, Ref<Api.User.User> newMember);
}