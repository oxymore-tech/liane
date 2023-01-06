using System.Threading.Tasks;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Ref;
using MongoDB.Driver;

namespace Liane.Service.Internal.Mongo;

public abstract class MongoCrudService<T> : ICrudService<T>  where T : class, IIdentity
{
    
    protected readonly IMongoDatabase Mongo;
    public MongoCrudService(MongoSettings settings)
    {
        Mongo = settings.GetDatabase();
    }

    public async Task<T> Get(Ref<T> reference)
    {
        return await reference.Resolve(async (id) => 
        {
            var obj = await Mongo.GetCollection<T>()
                .Find(p => p.Id == id)
                .FirstOrDefaultAsync();
            if (obj is null)
            {
                throw new ResourceNotFoundException($"{typeof(T).Name} '{id}' not found");
            }

            return obj;
        });

    }

    // As of C#10, there is no generic constraint for record types, so no default implementation
    // because `obj with { Id = newId.ToString() }` is not supported
    public abstract Task<T> Create(T obj);
    

    public async Task Delete(Ref<T> reference)
    {
        await Mongo.GetCollection<T>()
            .DeleteOneAsync(rp => rp.Id == reference.Id);
    }
    
    public async Task Update(Ref<T> reference, T obj)
    {
        await Mongo.GetCollection<T>()
            .ReplaceOneAsync(
                rp => rp.Id == reference.Id,
                obj
            );
    }
}