using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Util;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.Internal.Mongo;

public abstract class BaseMongoCrudService<TDb, TOut> : IInternalResourceResolverService<TDb, TOut> where TDb : class, IIdentity where TOut : class, IIdentity
{
  protected readonly IMongoDatabase Mongo;

  private async Task<TCollection?> ResolveRef<TCollection>(string id) where TCollection : class, IIdentity
  {
    var obj = await Mongo.GetCollection<TCollection>()
      .Find(p => p.Id == id)
      .FirstOrDefaultAsync();

    return obj;
  }

  protected BaseMongoCrudService(IMongoDatabase mongo)
  {
    Mongo = mongo;
  }

  public virtual async Task<TOut> Get(Ref<TOut> reference)
  {
    if (reference is Ref<TOut>.Resolved resolved1) return resolved1.Value;
    var resolved = await ResolveRef<TDb>(reference);
    if (resolved is null) throw new ResourceNotFoundException(typeof(TOut).Name + " not found : " + reference.Id);
    return await MapEntity(resolved);
  }

  public virtual async Task<Dictionary<string, TOut>> GetMany(ImmutableList<Ref<TOut>> references)
  {
    var query = Mongo.GetCollection<TDb>().Find(Builders<TDb>.Filter.In(f => f.Id, references.Select(r => (string)r).ToImmutableList()));
    var resolved = await query.SelectAsync(MapEntity);
    return resolved.ToDictionary(v => v.Id!);
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
    var value = await ResolveRef<TDb>(id);
    if (value is null)
    {
      throw ResourceNotFoundException.For((Ref<TDb>)id);
    }

    return filter(value) ? await MapEntity(value) : null;
  }

  protected FilterDefinition<TDb> GetAccessLevelFilter(string? userId, ResourceAccessLevel accessLevel)
  {
    return MongoAccessLevelContextFactory.NewMongoAccessLevelContext<TDb>(accessLevel, userId).HasAccessLevelFilterDefinition;
  }
}

public abstract class MongoCrudService<TIn, TDb, TOut> : BaseMongoCrudService<TDb, TOut>, ICrudService<TIn, TOut> where TIn : class, IIdentity where TDb : class, IIdentity where TOut : class, IIdentity
{
  protected MongoCrudService(IMongoDatabase mongo) : base(mongo)
  {
  }

  public virtual async Task<TOut> Create(TIn obj)
  {
    var id = obj.Id ?? ObjectId.GenerateNewId()
      .ToString();
    var created = ToDb(obj, id);
    await Mongo.GetCollection<TDb>()
      .InsertOneAsync(created);
    return await MapEntity(created);
  }

  protected abstract TDb ToDb(TIn inputDto, string originalId);
}

public abstract class MongoCrudService<T> : MongoCrudService<T, T, T> where T : class, IIdentity
{
  protected MongoCrudService(IMongoDatabase mongo) : base(mongo)
  {
  }

  protected override Task<T> MapEntity(T dbRecord)
  {
    return Task.FromResult(dbRecord);
  }
}

public abstract class MongoCrudEntityService<TIn, TDb, TOut> : BaseMongoCrudService<TDb, TOut>, ICrudEntityService<TIn, TOut>
  where TIn : class, IIdentity where TDb : class, IIdentity where TOut : class, IEntity
{
  protected readonly ICurrentContext CurrentContext;

  protected MongoCrudEntityService(IMongoDatabase mongo, ICurrentContext currentContext) : base(mongo)
  {
    CurrentContext = currentContext;
  }

  public async Task<TOut> Create(TIn lianeRequest, Ref<Api.User.User>? ownerId)
  {
    var id = lianeRequest.Id ?? ObjectId.GenerateNewId().ToString();
    var createdAt = DateTime.UtcNow;
    var created = await ToDb(lianeRequest, id, createdAt, ownerId ?? CurrentContext.CurrentUser().Id);
    await Mongo.GetCollection<TDb>()
      .InsertOneAsync(created);
    return await MapEntity(created);
  }

  protected abstract Task<TDb> ToDb(TIn inputDto, string originalId, DateTime createdAt, string createdBy);
}

public abstract class MongoCrudEntityService<T> : MongoCrudEntityService<T, T, T> where T : class, IEntity
{
  protected MongoCrudEntityService(IMongoDatabase mongo, ICurrentContext currentContext) : base(mongo, currentContext)
  {
  }

  protected override Task<T> MapEntity(T dbRecord)
  {
    return Task.FromResult(dbRecord);
  }
}