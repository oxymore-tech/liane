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

public abstract class BaseMongoCrudService<TDb, TOut>(IMongoDatabase mongo) : IInternalResourceResolverService<TDb, TOut>
  where TDb : class, IIdentity<string>
  where TOut : class, IIdentity<string>
{
  protected readonly IMongoDatabase Mongo = mongo;

  private async Task<TCollection?> ResolveRef<TCollection>(string id) where TCollection : class, IIdentity<string>
  {
    var obj = await Mongo.GetCollection<TCollection>()
      .Find(p => p.Id == id)
      .FirstOrDefaultAsync();

    return obj;
  }

  protected IMongoCollection<TDb> Collection => Mongo.GetCollection<TDb>();

  public virtual async Task<TOut> Get(Ref<TOut> reference)
  {
    if (reference is Ref<TOut>.Resolved resolved1) return resolved1.Value;
    var resolved = await ResolveRef<TDb>(reference);
    if (resolved is null) throw new ResourceNotFoundException(typeof(TOut).Name + " not found : " + reference.Id);
    return await MapEntity(resolved);
  }

  public virtual async Task<Dictionary<string, TOut>> GetMany(ImmutableList<Ref<TOut>> references)
  {
    var query = Collection.Find(Builders<TDb>.Filter.In(f => f.Id, references.Select(r => (string)r).ToImmutableList()));
    var resolved = await query.SelectAsync(MapEntity);
    return resolved.ToDictionary(v => v.Id!);
  }

  public virtual async Task<bool> Delete(Ref<TOut> reference)
  {
    var res = await Collection
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

  protected Task<long> Count(FilterDefinition<TDb>? filter = null)
  {
    return Collection.CountDocumentsAsync(filter ?? FilterDefinition<TDb>.Empty);
  }

  protected Task<TDb> Update(string id, UpdateDefinition<TDb> update)
  {
    return Collection.FindOneAndUpdateAsync<TDb>(r => r.Id == id, update, new FindOneAndUpdateOptions<TDb> { ReturnDocument = ReturnDocument.After });
  }
}

public abstract class MongoCrudService<TIn, TDb, TOut>(IMongoDatabase mongo) : BaseMongoCrudService<TDb, TOut>(mongo), ICrudService<TIn, TOut>
  where TIn : class, IIdentity<string>
  where TDb : class, IIdentity<string>
  where TOut : class, IIdentity<string>
{
  public virtual async Task<TOut> Create(TIn obj)
  {
    var id = obj.Id ?? ObjectId.GenerateNewId()
      .ToString();
    var created = ToDb(obj, id);
    await Collection
      .InsertOneAsync(created);
    return await MapEntity(created);
  }

  protected abstract TDb ToDb(TIn inputDto, string originalId);
}

public abstract class MongoCrudService<T>(IMongoDatabase mongo) : MongoCrudService<T, T, T>(mongo)
  where T : class, IIdentity<string>
{
  protected override Task<T> MapEntity(T dbRecord)
  {
    return Task.FromResult(dbRecord);
  }
}

public abstract class MongoCrudEntityService<TIn, TDb, TOut>(IMongoDatabase mongo, ICurrentContext currentContext) : BaseMongoCrudService<TDb, TOut>(mongo), ICrudEntityService<TIn, TOut>
  where TIn : class, IIdentity<string>
  where TDb : class, IIdentity<string>
  where TOut : class, IEntity<string>
{
  protected readonly ICurrentContext CurrentContext = currentContext;

  public async Task<TOut> Create(TIn lianeRequest, Ref<Api.User.User>? ownerId)
  {
    var id = lianeRequest.Id ?? ObjectId.GenerateNewId().ToString();
    var createdAt = DateTime.UtcNow;
    var created = await ToDb(lianeRequest, id, createdAt, ownerId ?? CurrentContext.CurrentUser().Id);
    await Collection
      .InsertOneAsync(created);
    return await MapEntity(created);
  }

  protected abstract Task<TDb> ToDb(TIn inputDto, string originalId, DateTime createdAt, string createdBy);
}

public abstract class MongoCrudEntityService<T>(IMongoDatabase mongo, ICurrentContext currentContext) : MongoCrudEntityService<T, T, T>(mongo, currentContext)
  where T : class, IEntity<string>
{
  protected override Task<T> MapEntity(T dbRecord)
  {
    return Task.FromResult(dbRecord);
  }
}