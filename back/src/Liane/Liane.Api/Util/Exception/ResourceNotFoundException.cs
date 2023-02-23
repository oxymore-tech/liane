using Liane.Api.Util.Ref;

namespace Liane.Api.Util.Exception;

public class ResourceNotFoundException : System.Exception
{
    public ResourceNotFoundException(string message) : base(message)
    {
    }
    
    public static ResourceNotFoundException For<T>(Ref<T> reference) where T : class, IIdentity
    {
      return new ResourceNotFoundException($"{nameof(T)} with id '{reference.Id}'");
    }
}