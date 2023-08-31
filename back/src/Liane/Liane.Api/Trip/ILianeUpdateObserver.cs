using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public interface ILianeUpdateObserver
{
  Task Push(Liane liane, ImmutableList<Ref<User.User>>? toMembers = null);
}