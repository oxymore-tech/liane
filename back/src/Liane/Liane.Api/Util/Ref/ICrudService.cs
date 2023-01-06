using System.Threading.Tasks;

namespace Liane.Api.Util.Ref;

public interface ICrudService<T>  where T : class, IIdentity
{ 
    /// <summary>
    /// Returns the resolved object from a given reference
    /// </summary>
    Task<T> Get(Ref<T> reference);


    Task Delete(Ref<T> reference);

     Task<T> Create(T obj);

     Task Update(Ref<T> reference, T obj);

}