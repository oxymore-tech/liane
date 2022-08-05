using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using IRedis = Liane.Api.Util.IRedis;

namespace Liane.Service.Internal.Util;

public sealed class RedisClient : IRedis
{
    private readonly ILogger<RedisClient> logger;
    private readonly RedisSettings redisSettings;
    private ConnectionMultiplexer? internalRedis;

    public RedisClient(ILogger<RedisClient> logger, RedisSettings redisSettings)
    {
        this.logger = logger;
        this.redisSettings = redisSettings;
    }

    public async Task<IDatabase> Get()
    {
        var redis = await GetRedis();
        return redis.GetDatabase();
    }

    public Task<ImmutableList<RedisKey>> ListEdgeKeys(DayOfWeek? day = null) => ListKeys(RedisKeys.Trip(day: day));

    public async Task<ImmutableList<RedisKey>> ListKeys(string keyPattern)
    {
        var redis = await GetRedis();
        var endPoints = redis.GetEndPoints();
        IServer server = redis.GetServer(endPoints[0]);
        var keys = server.Keys(-1, keyPattern);
        return keys.ToImmutableList();
    }

    private async Task<ConnectionMultiplexer> GetRedis()
    {
        if (internalRedis == null)
        {
            internalRedis = await ConnectionMultiplexer.ConnectAsync(new ConfigurationOptions {EndPoints = {{redisSettings.Host, 6379}}, Password = redisSettings.Password});
            logger.LogInformation("Successfully connected to redis");
        }

        return internalRedis;
    }
}