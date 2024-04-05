using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Trip.Event;

public interface IAutomaticAnswerService
{
  Task<bool> TryAcceptRequest(TripEvent.JoinRequest joinRequest, Ref<Api.Auth.User> newMember);
}