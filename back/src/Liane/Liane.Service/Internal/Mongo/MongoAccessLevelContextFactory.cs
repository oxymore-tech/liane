using System;
using System.Data;
using System.Linq;
using Liane.Api.Auth;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Util;

namespace Liane.Service.Internal.Mongo;

public class MongoAccessLevelContextFactory : IAccessLevelContextFactory
{

  public static IMongoAccessLevelContext<TDb> NewMongoAccessLevelContext<TDb>(ResourceAccessLevel accessLevel, string? userId) where TDb : class, IIdentity
  {
    return Create<TDb>(accessLevel, userId);
  }
  
  private static IMongoAccessLevelContext<TDb> Create<TDb>(ResourceAccessLevel accessLevel, string? currentUserId) where TDb : class, IIdentity
  {
    // Create instance for the given access level 
    var internalResourceType = typeof(TDb);
    Type classType;
    switch (accessLevel)
    {
      case ResourceAccessLevel.Member:

        // Check given type is ISharedResource 
        var targetInterface = internalResourceType.GetInterfaces().FirstOrDefault(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(ISharedResource<>));
        if (targetInterface != null)
        {
          var memberType = targetInterface.GetGenericArguments()[0];
          classType = typeof(MemberAccessLevelContext<,>).MakeGenericType(internalResourceType, memberType);
          return (IMongoAccessLevelContext<TDb>)Activator.CreateInstance(classType, currentUserId)!;
        }
        else
        {
          throw new ConstraintException($"Member access error : type {nameof(TDb)} does not implement ISharedResource");
        }
      case ResourceAccessLevel.Owner:
        if (typeof(TDb).GetInterface(nameof(IEntity)) != null)
        {
          classType = typeof(OwnerAccessLevelContext<>).MakeGenericType(internalResourceType);
          return (IMongoAccessLevelContext<TDb>)Activator.CreateInstance(classType, currentUserId)!;
        } else
        {
          throw new ConstraintException($"Owner access error : type {nameof(TDb)} does not implement IEntity");
        }
      default:
        classType = typeof(PublicAccessLevelContext<>).MakeGenericType(internalResourceType);
        return (IMongoAccessLevelContext<TDb>)Activator.CreateInstance(classType)!;
    }
    
}
  public IAccessLevelContext<T> NewAccessLevelContext<T>(ResourceAccessLevel accessLevel,  AuthUser? currentUser) where T : class, IIdentity
   {
     return Create<T>(accessLevel, currentUser?.Id);
   }
}