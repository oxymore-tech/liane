using System.Threading.Tasks;
using Liane.Service.Internal.Display;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using IRedis = Liane.Api.Util.IRedis;

namespace Liane.Service.Internal.Util
{
    public sealed class RedisClient : IRedis
    {
        private readonly ILogger<RedisClient> logger;
        private readonly RedisSettings redisSettings;
        private ConnectionMultiplexer? redis;

        public RedisClient(ILogger<RedisClient> logger, RedisSettings redisSettings)
        {
            this.logger = logger;
            this.redisSettings = redisSettings;
        }

        public async Task<IDatabase> Get()
        {
            if (redis == null)
            {
                redis = await ConnectionMultiplexer.ConnectAsync(new ConfigurationOptions {EndPoints = {{redisSettings.Host, 6379}}, Password = redisSettings.Password});
                logger.LogInformation("Successfully connected to redis");
                return redis.GetDatabase();
            }

            return redis.GetDatabase();
        }
    }
}