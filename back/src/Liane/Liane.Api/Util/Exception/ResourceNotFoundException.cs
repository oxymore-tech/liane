using Liane.Api.Util.Ref;

namespace Liane.Api.Util.Exception;

public sealed class ResourceNotFoundException : System.Exception
{
  public ResourceNotFoundException(string message) : base(message)
  {
  }

  public static ResourceNotFoundException For<T>(Ref<T> reference) where T : class, IIdentity
  {
    return new ResourceNotFoundException($"{typeof(T).Name} with id '{reference.Id}'");
  }
}