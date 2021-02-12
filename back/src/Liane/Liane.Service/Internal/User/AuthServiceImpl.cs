using System;
using System.Threading.Tasks;
using Liane.Api.User;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using Twilio;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;
using IRedis = Liane.Api.Util.IRedis;

namespace Liane.Service.Internal.User
{
    public sealed class AuthServiceImpl : IAuthService
    {
        private readonly ILogger<AuthServiceImpl> logger;
        private readonly IRedis redis;
        private readonly TwilioSettings settings;

        public AuthServiceImpl(ILogger<AuthServiceImpl> logger, IRedis redis, TwilioSettings settings)
        {
            this.logger = logger;
            this.redis = redis;
            this.settings = settings;
        }

        public async Task SendSms(string number)
        {
            TwilioClient.Init(settings.Account, settings.Token);

            var phoneNumber = ParseNumber(number);

            var database = await redis.Get();
            var generator = new Random();
            var code = generator.Next(0, 1000000).ToString("D6");
            var redisKey = new RedisKey($"auth_sms_token_{phoneNumber}");
            await database.StringSetAsync(redisKey, code);
            await database.KeyExpireAsync(redisKey, TimeSpan.FromSeconds(10));

            var message = await MessageResource.CreateAsync(
                body: $"Voici votre code liane : {code}",
                from: new PhoneNumber(settings.From),
                to: phoneNumber
            );
            logger.LogInformation("SMS sent {message}", message);
        }

        private static PhoneNumber ParseNumber(string number)
        {
            var trim = number.Trim();
            if (trim.StartsWith("0"))
            {
                trim = $"+33{trim.Substring(1)}";
            }

            return new PhoneNumber(trim);
        }
    }
}