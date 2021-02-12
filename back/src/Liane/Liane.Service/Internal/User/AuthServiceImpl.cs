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

        public AuthServiceImpl(ILogger<AuthServiceImpl> logger, IRedis redis)
        {
            this.logger = logger;
            this.redis = redis;
        }

        public async Task SendSms(string number)
        {
            var accountSid = Environment.GetEnvironmentVariable("TWILIO_ACCOUNT_SID");
            var authToken = Environment.GetEnvironmentVariable("TWILIO_AUTH_TOKEN");

            if (accountSid == null || authToken == null)
            {
                throw new ArgumentException("Twilio env var must be set : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN");
            }

            TwilioClient.Init(accountSid, authToken);

            var phoneNumber = ParseNumber(number);

            var database = await redis.Get();
            var generator = new Random();
            var code = generator.Next(0, 1000000).ToString("D6");
            var redisKey = new RedisKey($"auth_sms_token_{phoneNumber}");
            await database.StringSetAsync(redisKey, code);
            await database.KeyExpireAsync(redisKey, TimeSpan.FromSeconds(10));

            var message = await MessageResource.CreateAsync(
                body: $"Voici votre code liane : {code}",
                from: new PhoneNumber("+13043086200"),
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