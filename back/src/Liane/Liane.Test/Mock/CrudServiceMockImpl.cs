using System.Threading.Tasks;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Ref;

namespace Liane.Test.Mock;

public abstract class CrudServiceMockImpl<T> : ICrudService<T> where T : class, IIdentity
{
    
    public Task<T> Get(Ref<T> reference)
    {
        var value = (T?)reference;
        if (value is null)
        {
            throw new ResourceNotFoundException($"Ref<{typeof(T).Name}> '{reference.Id}' has no value");
        }
        return Task.FromResult(value);
    }

    public Task Delete(Ref<T> reference)
    {
        throw new System.NotImplementedException();
    }
    
    public Task Update(Ref<T> reference, T obj)
    {
        throw new System.NotImplementedException();
    }

    public abstract Task<T> Create(T obj);
}