using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Liane.Api.User;
using Liane.Api.Util.Http;
using Liane.Service.Internal.Mongo;
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
    private const int KeySize = 64;

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

            if (twilioSettings is { Account: { }, Token: { } })
            {
                TwilioClient.Init(twilioSettings.Account, twilioSettings.Token);
                var generator = new Random();
                var code = generator.Next(0, 1000000).ToString("D6");

                smsCodeCache.Set(phoneNumber.ToString(), code, TimeSpan.FromMinutes(2));

                var message = await MessageResource.CreateAsync(
                    body: $"{code} est votre code liane",
                    from: new PhoneNumber(twilioSettings.From),
                    to: phoneNumber
                );

                logger.LogInformation("SMS sent {message} to {phoneNumber} with code {code}", message, phoneNumber, code);
            }
        }
    }

    public async Task<AuthResponse> Login(string phone, string code)
    {
        if (phone.Equals(authSettings.TestAccount) && code.Equals(authSettings.TestCode))
        {
            var user = new AuthUser($"test:{authSettings.TestAccount}", authSettings.TestAccount, true);
            return GenerateAuthResponse(user, null);
        }

        var phoneNumber = ParseNumber(phone);

        if (!smsCodeCache.TryGetValue(phoneNumber.ToString(), out string expectedCode))
        {
            throw new UnauthorizedAccessException("Invalid code");
        }

        if (expectedCode != code)
        {
            throw new UnauthorizedAccessException("Invalid code");
        }

        var number = phoneNumber.ToString();

        var mongoCollection = mongo.GetCollection<DbUser>();

        var dbUser = (await mongoCollection.FindAsync(u => u.Phone == number))
            .FirstOrDefault();

        if (dbUser is null)
        {
            dbUser = new DbUser(ObjectId.GenerateNewId(), false, number, null, null);
            await mongoCollection.InsertOneAsync(dbUser);
        }

        var authUser = new AuthUser(dbUser.Id.ToString(), number, dbUser.IsAdmin);
        var refreshToken = await GenerateRefreshToken(dbUser);
        return GenerateAuthResponse(authUser, refreshToken);
    }

    public async Task<AuthResponse> RefreshToken(string userId, string refreshToken)
    {
        var foundUser = (await mongo.GetCollection<DbUser>().FindAsync(u => u.Id == new ObjectId(userId))).FirstOrDefault();
        
        if (foundUser.RefreshToken is null)
        {
            throw new UnauthorizedAccessException();
        }
        
        if (foundUser.RefreshToken != HashString(refreshToken, Convert.FromBase64String(foundUser.Salt!)))
        {
            await RevokeRefreshToken(userId);
            throw new UnauthorizedAccessException();
        }

        var authUser = new AuthUser(foundUser.Id.ToString(), foundUser.Phone, foundUser.IsAdmin);
        return GenerateAuthResponse(authUser, await GenerateRefreshToken(foundUser));
    }

    public ClaimsPrincipal IsTokenValid(string token)
    {
        var tokenValidationParameters = new TokenValidationParameters
        {
            IssuerSigningKey = signinKey,
            ValidIssuer = authSettings.Issuer,
            ValidAudience = authSettings.Audience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
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

    private async Task RevokeRefreshToken(string userId)
    {
        var filter = Builders<DbUser>.Filter.Eq(u => u.Id, new ObjectId(userId));
        var update = Builders<DbUser>.Update.Unset(u => u.RefreshToken);
        var upsert = new UpdateOptions()
        {
            IsUpsert = false
        };
        await mongo.GetCollection<DbUser>().UpdateOneAsync(filter, update, upsert);
    }

    public async Task Logout()
    {
        await RevokeRefreshToken(currentContext.CurrentUser().Id);
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

    private AuthResponse GenerateAuthResponse(AuthUser user, string? refreshToken)
    {
        var token = new AuthToken(GenerateToken(user), (long)authSettings.Validity.TotalMilliseconds, refreshToken);
        return new AuthResponse(user, token);
    }

    private static string HashString(string secret, byte[] salt)
    {
        var hash = Rfc2898DeriveBytes.Pbkdf2(
            Encoding.UTF8.GetBytes(secret),
            salt,
            350000,
            HashAlgorithmName.SHA512,
            KeySize);
        return Convert.ToBase64String(hash);
    }

    private async Task<string> GenerateRefreshToken(DbUser user)
    {
        // Generate token & salt
        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(KeySize));
        var salt = RandomNumberGenerator.GetBytes(KeySize);
        var encryptedToken = HashString(token, salt);

        // Store encrypted token and salt for this user
        var updateToken = Builders<DbUser>.Update.Set(u => u.RefreshToken, encryptedToken);
        var updateSalt = Builders<DbUser>.Update.Set(u => u.Salt, Convert.ToBase64String(salt));
        await mongo.GetCollection<DbUser>()
            .UpdateOneAsync(u => u.Id == user.Id, Builders<DbUser>.Update.Combine(updateToken, updateSalt));

        return token;
    }

    private string GenerateToken(AuthUser user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, user.Id),
            new(ClaimTypes.MobilePhone, user.Phone),
            new(ClaimTypes.Role, user.IsAdmin ? AdminRole : UserRole)
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