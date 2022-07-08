using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Liane.Api.User;
using Liane.Api.Util.Http;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Bson;
using MongoDB.Driver;
using Twilio;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;

namespace Liane.Service.Internal.User;

public sealed class AuthServiceImpl : IAuthService
{
    public const string AdminRole = "admin";
    private const string UserRole = "user";
    private static readonly JwtSecurityTokenHandler JwtTokenHandler = new();
    private readonly ILogger<AuthServiceImpl> logger;
    private readonly TwilioSettings twilioSettings;
    private readonly AuthSettings authSettings;
    private readonly SymmetricSecurityKey signinKey;
    private readonly ICurrentContext currentContext;
    private readonly MemoryCache smsCodeCache = new(new MemoryCacheOptions());
    private readonly IMongoDatabase mongo;

    public AuthServiceImpl(ILogger<AuthServiceImpl> logger, TwilioSettings twilioSettings, AuthSettings authSettings, ICurrentContext currentContext, MongoSettings mongoSettings)
    {
        mongo = mongoSettings.GetDatabase();
        this.logger = logger;
        this.twilioSettings = twilioSettings;
        this.authSettings = authSettings;
        var keyByteArray = Encoding.ASCII.GetBytes(authSettings.SecretKey);
        signinKey = new SymmetricSecurityKey(keyByteArray);
        this.currentContext = currentContext;
    }

    public async Task SendSms(string phone)
    {
        logger.LogDebug("start send sms ");

        if (authSettings.TestAccount == null || !phone.Equals(authSettings.TestAccount))
        {
            var phoneNumber = ParseNumber(phone);

            if (smsCodeCache.TryGetValue($"attempt:{phoneNumber}", out _))
            {
                throw new UnauthorizedAccessException("Too many requests");
            }

            smsCodeCache.Set($"attempt:{phoneNumber}", true, TimeSpan.FromSeconds(5));

            if (twilioSettings.Account != null && twilioSettings.Token != null)
            {
                TwilioClient.Init(twilioSettings.Account, twilioSettings.Token);
                var generator = new Random();
                var code = generator.Next(0, 1000000).ToString("D6");

                smsCodeCache.Set(phoneNumber, code, TimeSpan.FromMinutes(2));

                var message = await MessageResource.CreateAsync(
                    body: $"{code} est votre code liane",
                    from: new PhoneNumber(twilioSettings.From),
                    to: phoneNumber
                );

                logger.LogInformation($"SMS sent {message} to {phoneNumber} with code {code}");
            }
        }
    }

    public async Task<AuthUser> Login(string phone, string code, string? token)
    {
        if (phone.Equals(authSettings.TestAccount) && code.Equals(authSettings.TestCode))
        {
            return new AuthUser(authSettings.TestAccount, GenerateToken(authSettings.TestAccount, false), false);
        }
        
        var phoneNumber = ParseNumber(phone);
        if (!smsCodeCache.TryGetValue(phoneNumber, out string expectedCode))
        {
            throw new UnauthorizedAccessException("Invalid code");
        }
        Console.WriteLine("HERE 1 > " + expectedCode);
        
        if (expectedCode != code)
        {
            throw new UnauthorizedAccessException("Invalid code");
        }

        var number = phoneNumber.ToString();

        var mongoCollection = mongo.GetCollection<DbUser>();

        var dbUser = (await mongoCollection.FindAsync(u => u.Phone == number))
            .FirstOrDefault();

        var isAdmin = dbUser?.IsAdmin ?? false;
        if (dbUser is null)
        {
            await mongoCollection.InsertOneAsync(new DbUser(ObjectId.GenerateNewId(), isAdmin, number));
        }

        return new AuthUser(number, GenerateToken(number, isAdmin), isAdmin);
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
            throw new UnauthorizedAccessException("Invalid token");
        }
    }

    public Task<AuthUser> Me()
    {
        var authUser = currentContext.CurrentUser();
        var token = GenerateToken(authUser.Phone, authUser.IsAdmin);
        return Task.FromResult(authUser with { Token = token });
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

    private string GenerateToken(string phoneNumber, bool isAdmin)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, phoneNumber),
            new(ClaimTypes.Role, isAdmin ? AdminRole : UserRole)
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