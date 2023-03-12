using System.Collections.Immutable;
using Liane.Api.Util.Ref;

namespace Liane.Api.Util.Http;

public interface ISharedResource<T> where T : IResourceMember 
{
  public ImmutableList<T> Members { get; }
}

public interface IResourceMember
{
  public Ref<User.User> User { get; }
}
  