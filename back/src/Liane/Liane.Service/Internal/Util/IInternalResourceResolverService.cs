using System;
using System.Threading.Tasks;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Util;

public interface IInternalResourceResolverService<out TDb, TOut> where TOut : class, IIdentity where TDb : class, IIdentity
{
  /// <summary>
  /// Gets a resource and returns it if the applied predicate returns true.
  /// This method will throw if the resource does not exist.
  /// </summary>
  /// <param name="id"></param> the resource id
  /// <param name="filter"></param> 
  /// <returns>TOut or null if predicate is false</returns>
  Task<TOut?> GetIfMatches(string id, Predicate<TDb> filter);
}