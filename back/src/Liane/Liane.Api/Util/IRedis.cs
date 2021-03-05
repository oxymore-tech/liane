using System.Collections.Immutable;
using System.Threading.Tasks;
using StackExchange.Redis;

namespace Liane.Api.Util
{
    public interface IRedis
    {
        Task<ImmutableList<RedisKey>> ListEdgeKeys() => ListKeys("*|*|*|*");

        Task<IDatabase> Get();
        Task<ImmutableList<RedisKey>> ListKeys(string keyPattern);
    }
}