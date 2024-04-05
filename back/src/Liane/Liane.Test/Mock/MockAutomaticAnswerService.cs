using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Auth;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Trip.Event;

namespace Liane.Test.Mock;

public sealed class MockAutomaticAnswerService : IAutomaticAnswerService
{
  public Task<bool> TryAcceptRequest(TripEvent.JoinRequest joinRequest, Ref<User> newMember)
  {
    return Task.FromResult(false);
  }
}
