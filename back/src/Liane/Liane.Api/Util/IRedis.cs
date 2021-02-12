using System.Threading.Tasks;
using StackExchange.Redis;

namespace Liane.Api.Util
{
    public interface IRedis
    {
        Task<IDatabase> Get();
    }
}