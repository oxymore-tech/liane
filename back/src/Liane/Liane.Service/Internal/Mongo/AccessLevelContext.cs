using System;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Util;
using Liane.Web.Internal.AccessLevel;
using MongoDB.Driver;

namespace Liane.Service.Internal.Mongo;


 public interface IMongoAccessLevelContext<TDb> : IAccessLevelContext<TDb> where TDb : class, IIdentity
 {
   public FilterDefinition<TDb> HasAccessLevelFilterDefinition { get;}
 }
 class PublicAccessLevelContext<TDb> : IMongoAccessLevelContext<TDb> where TDb : class, IIdentity
{
  public  ResourceAccessLevel AccessLevel => ResourceAccessLevel.Any;
  public  Predicate<TDb> HasAccessLevelPredicate => delegate { return true; };
  
  public FilterDefinition<TDb> HasAccessLevelFilterDefinition => FilterDefinition<TDb>.Empty;
}


 class OwnerAccessLevelContext<TDb> : IMongoAccessLevelContext<TDb> where TDb : class, IEntity
{
  private readonly string currentUserId;

  public OwnerAccessLevelContext(string? currentUserId)
  {
    this.currentUserId = currentUserId!;
  }


  public  ResourceAccessLevel AccessLevel => ResourceAccessLevel.Owner;

  public  Predicate<TDb> HasAccessLevelPredicate => t => t.CreatedBy!.Id == currentUserId;

 public  FilterDefinition<TDb> HasAccessLevelFilterDefinition
  {
    get {
      return Builders<TDb>.Filter.Eq(m => m.CreatedBy!.Id, currentUserId);
    }
}
  
}

 class MemberAccessLevelContext<TDb, TMemberDb> : IMongoAccessLevelContext<TDb> where TDb : class, IIdentity, ISharedResource<TMemberDb> where TMemberDb : IResourceMember
{
  private readonly string currentUserId;

  public MemberAccessLevelContext(string? currentUserId)
  {
    this.currentUserId = currentUserId!;
  }

  public  ResourceAccessLevel AccessLevel => ResourceAccessLevel.Member;
  
  public  Predicate<TDb> HasAccessLevelPredicate => delegate(TDb t)
  {
    return t.Members.Exists(m => (string)m.User == currentUserId);
  };
 

  public  FilterDefinition<TDb> HasAccessLevelFilterDefinition
  {
    get
    { // Ref .Id does not work inside mongo Db 
      return Builders<TDb>.Filter.ElemMatch(l => l.Members, m => (string)m.User == currentUserId);
    }
  }
  
}

