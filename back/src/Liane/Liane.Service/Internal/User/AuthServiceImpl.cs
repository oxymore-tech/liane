using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Liane.Api.User;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Http;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using StackExchange.Redis;
using Twilio;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;
using IRedis = Liane.Api.Util.IRedis;

namespace Liane.Service.Internal.User
{
    public sealed class AuthServiceImpl : IAuthService
    {
        private static readonly JwtSecurityTokenHandler JwtTokenHandler = new();
        private readonly ILogger<AuthServiceImpl> logger;
        private readonly IRedis redis;
        private readonly TwilioSettings twilioSettings;
        private readonly AuthSettings authSettings;
        private readonly SymmetricSecurityKey signinKey;
        private readonly ICurrentContext currentContext;

        public AuthServiceImpl(ILogger<AuthServiceImpl> logger, IRedis redis, TwilioSettings twilioSettings, AuthSettings authSettings, ICurrentContext currentContext)
        {
            this.logger = logger;
            this.redis = redis;
            this.twilioSettings = twilioSettings;
            this.authSettings = authSettings;
            var keyByteArray = Encoding.ASCII.GetBytes(authSettings.SecretKey);
            signinKey = new SymmetricSecurityKey(keyByteArray);
            this.currentContext = currentContext;
        }

        public async Task SendSms(string phone)
        {
            if (twilioSettings.Account != null && twilioSettings.Token != null)
            {
                TwilioClient.Init(twilioSettings.Account, twilioSettings.Token);
                var phoneNumber = ParseNumber(phone);
                var generator = new Random();
                var code = generator.Next(0, 1000000).ToString("D6");
                var redisKey = AuthSmsTokenRedisKey(phoneNumber);
                var database = await redis.Get();
                await database.StringSetAsync(redisKey, code, TimeSpan.FromMinutes(5));
                var message = await MessageResource.CreateAsync(
                    body: $"Voici votre code liane: {code}",
                    from: new PhoneNumber(twilioSettings.From),
                    to: phoneNumber
                );
                logger.LogInformation("SMS sent {@message}", message);
            }
        }

        public async Task<AuthUser> Login(string phone, string code, string token)
        {
            var phoneNumber = ParseNumber(phone);
            var database = await redis.Get();
            var redisKey = AuthSmsTokenRedisKey(phoneNumber);
            var value = await database.StringGetAsync(redisKey);
            if (value.IsNullOrEmpty)
            {
                throw new UnauthorizedAccessException("Code expired");
            }

            if (value != code)
            {
                throw new UnauthorizedAccessException("Invalid code");
            }

            var redisKey2 = "notification_token:" + phone;
            await database.StringSetAsync(redisKey2, token);
            return new AuthUser(phone, GenerateToken(phone));
        }

        public ClaimsPrincipal IsTokenValid(string token)
        {
            var tokenValidationParameters = new TokenValidationParameters
            {
                IssuerSigningKey = signinKey,
                ValidIssuer = authSettings.Issuer,
                ValidAudience = authSettings.Audience
            };
            try
            {
                return JwtTokenHandler.ValidateToken(token, tokenValidationParameters, out _);
            }
            catch
            {
                throw new ForbiddenException("Invalid token");
            }
        }

        public Task<AuthUser> Me()
        {
            var phoneNumber = currentContext.CurrentUser();
            var token = GenerateToken(phoneNumber);
            return Task.FromResult(new AuthUser(phoneNumber, token));
        }

        private static RedisKey AuthSmsTokenRedisKey(PhoneNumber phoneNumber)
        {
            return $"auth_sms_token_${phoneNumber}";
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

        private string GenerateToken(string phoneNumber)
        {
            var claims = new List<Claim>
            {
                new(ClaimTypes.Name, phoneNumber)
            };

            var now = DateTime.UtcNow;
            var expires = now.Add(authSettings.Validity);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Issuer = authSettings.Issuer,
                Subject = new ClaimsIdentity(claims),
                Audience = authSettings.Audience,
                IssuedAt = now,
                Expires = expires,
                SigningCredentials = new SigningCredentials(signinKey, SecurityAlgorithms.HmacSha256)
            };
            return JwtTokenHandler.CreateEncodedJwt(tokenDescriptor);
        }
    }
}