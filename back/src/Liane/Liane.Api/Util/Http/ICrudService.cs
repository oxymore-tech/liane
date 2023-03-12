using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Util.Ref;

namespace Liane.Api.Util.Http;

public interface IResourceResolverService<TOut> where TOut : class, IIdentity
{
  /// <summary>
  /// Returns the resolved object from a given reference
  /// </summary>
  Task<TOut> Get(Ref<TOut> reference);
  Task<Dictionary<string, TOut>> GetMany(ImmutableList<Ref<TOut>> references);
}

public interface ICrudService<TIn, TOut> : IResourceResolverService<TOut> where TIn : class where TOut : class, IIdentity
{
  Task<bool> Delete(Ref<TOut> reference);

  Task<TOut> Create(TIn obj);
}

public interface ICrudService<T> : ICrudService<T, T> where T : class, IIdentity
{
}

public interface ICrudEntityService<TIn, TOut> : IResourceResolverService<TOut> where TIn : class where TOut : class, IEntity
{
  Task<bool> Delete(Ref<TOut> reference);

  Task<TOut> Create(TIn obj, string ownerId);
}

public interface ICrudEntityService<T> : ICrudEntityService<T, T> where T : class, IEntity
{
}