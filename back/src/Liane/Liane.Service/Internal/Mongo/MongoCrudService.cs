using System;
using System.Threading.Tasks;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Util;
using Liane.Web.Internal.AccessLevel;
using MongoDB.Bson;
using MongoDB.Driver;
using Task = System.Threading.Tasks.Task;

namespace Liane.Service.Internal.Mongo;


public abstract class BaseMongoCrudService<TDb, TOut> : IInternalResourceResolverService<TDb, TOut> where TDb : class, IIdentity where TOut : class, IIdentity
{
    
  protected readonly IMongoDatabase Mongo;

  private async Task<TDb?> ResolveRef(string id)
  {
    var obj = await Mongo.GetCollection<TDb>()
      .Find(p => p.Id == id)
      .FirstOrDefaultAsync();

    return obj;
  }
  
  public BaseMongoCrudService(IMongoDatabase mongo)
  {
    Mongo = mongo;
  }

  public virtual async Task<TOut> Get(Ref<TOut> reference)
  {
    var resolved = await ResolveRef(reference);
    return await MapEntity(resolved!); //TODO can get send back null ?
  }
  
  public virtual async Task<bool> Delete(Ref<TOut> reference)
  {
    var res = await Mongo.GetCollection<TDb>()
      .DeleteOneAsync(rp => rp.Id == reference.Id);
    return res.IsAcknowledged;
  }

  protected abstract Task<TOut> MapEntity(TDb dbRecord);
  
  public async Task<TOut?> GetIfMatches(string id, Predicate<TDb> filter)
  {
    var value = await ResolveRef(id);
    if (value is null)
    {
      throw new ResourceNotFoundException($"{typeof(TDb).Name} '{id}' not found");
    }
    return filter(value) ? await MapEntity(value) : null;
  }

  protected FilterDefinition<TDb> GetAccessLevelFilter(string? userId, ResourceAccessLevel accessLevel)
  {
    return MongoAccessLevelContextFactory.NewMongoAccessLevelContext<TDb>(accessLevel, userId).HasAccessLevelFilterDefinition;
  }
  
  
}



public abstract class MongoCrudService<TIn, TDb, TOut> : BaseMongoCrudService<TDb, TOut>, ICrudService<TIn, TOut> where TIn : class where TDb : class, IIdentity where TOut : class, IIdentity
{
  protected MongoCrudService(IMongoDatabase mongo) : base(mongo)
  {
  }
  
  public async Task<TOut> Create(TIn obj)
  {
    var id = ObjectId.GenerateNewId()
      .ToString();
    var created = ToDb(obj, id);
    await Mongo.GetCollection<TDb>().InsertOneAsync(
      created);
    return await MapEntity(created);
  }

  protected abstract TDb ToDb(TIn inputDto, string originalId);


}

public abstract class MongoCrudService<T> : MongoCrudService<T,T,T>  where T : class, IIdentity
{
  protected MongoCrudService(IMongoDatabase mongo) : base(mongo)
  {
  }

  protected override Task<T> MapEntity(T dbRecord)
  {
    return Task.FromResult(dbRecord);
  }
  

}



public abstract class MongoCrudEntityService<TIn, TDb, TOut> : BaseMongoCrudService<TDb, TOut>, ICrudEntityService<TIn, TOut> where TIn : class where TDb : class, IIdentity where TOut : class, IEntity
{
  protected MongoCrudEntityService(IMongoDatabase mongo) : base(mongo)
  {
  }
  
  public async Task<TOut> Create(TIn obj, string ownerId)
  {
    var id = ObjectId.GenerateNewId()
      .ToString();
    var createdBy = ownerId;
    var createdAt = DateTime.UtcNow;
    var created = ToDb(obj, id, createdAt, createdBy);
    await Mongo.GetCollection<TDb>().InsertOneAsync(
      created);
    return await MapEntity(created);
  }

  protected abstract TDb ToDb(TIn inputDto, string originalId, DateTime createdAt, string createdBy);


}


public abstract class MongoCrudEntityService<T> : MongoCrudEntityService<T,T,T>  where T : class, IEntity
{
  protected MongoCrudEntityService(IMongoDatabase mongo) : base(mongo)
  {
  }
  protected override Task<T> MapEntity(T dbRecord)
  {
    return Task.FromResult(dbRecord);
  }
}