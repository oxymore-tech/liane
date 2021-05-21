using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Liane.Api.User;
using Liane.Api.Util;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Http;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Twilio;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;

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
            if (authSettings.TestAccount == null || !phone.Equals(authSettings.TestAccount))
            {
                var phoneNumber = ParseNumber(phone);
                var database = await redis.Get();
                var authSmsAttemptKey = RedisKeys.AuthSmsAttempt(phoneNumber);
                var attempts = await database.StringIncrementAsync(authSmsAttemptKey);
                await database.KeyExpireAsync(authSmsAttemptKey, TimeSpan.FromSeconds(5));
                if (attempts > 1)
                {
                    throw new UnauthorizedAccessException("Too many requests");
                }

                if (twilioSettings.Account != null && twilioSettings.Token != null)
                {
                    TwilioClient.Init(twilioSettings.Account, twilioSettings.Token);
                    var generator = new Random();
                    var code = generator.Next(0, 1000000).ToString("D6");
                    var redisKey = RedisKeys.AuthSmsToken(phoneNumber);
                    await database.StringSetAsync(redisKey, code, TimeSpan.FromMinutes(2));
                    var message = await MessageResource.CreateAsync(
                        body: $"{code} est votre code liane",
                        from: new PhoneNumber(twilioSettings.From),
                        to: phoneNumber
                    );
                    logger.LogInformation("SMS sent {@message}", message);
                }
            }
        }

        public async Task<AuthUser> Login(string phone, string code, string token)
        {
            if (phone.Equals(authSettings.TestAccount) && code.Equals(authSettings.TestCode))
            {
                return new AuthUser(authSettings.TestAccount, GenerateToken(authSettings.TestAccount));
            }

            var phoneNumber = ParseNumber(phone);
            var database = await redis.Get();
            var redisKey = RedisKeys.AuthSmsToken(phoneNumber);
            var value = await database.StringGetAsync(redisKey);
            if (value.IsNullOrEmpty)
            {
                throw new UnauthorizedAccessException("Invalid code");
            }

            if (value != code)
            {
                await database.KeyDeleteAsync(RedisKeys.AuthSmsToken(phoneNumber));
                throw new UnauthorizedAccessException("Invalid code");
            }

            await database.StringSetAsync(RedisKeys.NotificationToken(phoneNumber), token);
            var number = phoneNumber.ToString();
            return new AuthUser(number, GenerateToken(number));
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
            catch (Exception e)
            {
                logger.LogWarning(e, "Invalid token");
                throw new ForbiddenException("Invalid token");
            }
        }

        public Task<AuthUser> Me()
        {
            var phoneNumber = currentContext.CurrentUser();
            var token = GenerateToken(phoneNumber);
            return Task.FromResult(new AuthUser(phoneNumber, token));
        }

        private static PhoneNumber ParseNumber(string number)
        {
            var trim = number.Trim();
            if (trim.StartsWith("0"))
            {
                trim = $"+33{trim[1..]}";
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