using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.User;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Trip.Event;

namespace Liane.Test.Integration;

public sealed class MockAutomaticAnswerService : IAutomaticAnswerService
{
  public Task<bool> TryAcceptRequest(LianeEvent.JoinRequest joinRequest, Ref<User> newMember)
  {
    return Task.FromResult(false);
  }
}
