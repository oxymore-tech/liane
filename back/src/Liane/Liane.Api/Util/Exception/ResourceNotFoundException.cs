using Liane.Api.Util.Ref;

namespace Liane.Api.Util.Exception;

public sealed class ResourceNotFoundException(string message) : System.Exception(message)
{
  public static ResourceNotFoundException For<T>(Ref<T> reference) where T : class, IIdentity
  {
    return new ResourceNotFoundException($"{typeof(T).Name} with id '{reference.Id}'");
  }

  public static ResourceNotFoundException For<T, TId>(TId id) where T : class, IIdentity<TId>
  {
    return new ResourceNotFoundException($"{typeof(T).Name} with id '{id}'");
  }
}