using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using StackExchange.Redis;

namespace Liane.Api.Util;

public interface IRedis
{
    Task<ImmutableList<RedisKey>> ListEdgeKeys(DayOfWeek? day = null);
    Task<IDatabase> Get();
    Task<ImmutableList<RedisKey>> ListKeys(string keyPattern);
}