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

    public async Task<AuthResponse> Login(AuthRequest request)
    {
        if (request.Phone.Equals(authSettings.TestAccount) && request.Code.Equals(authSettings.TestCode))
        {
            var user = new AuthUser($"test:{authSettings.TestAccount}", authSettings.TestAccount, true);
            return GenerateAuthResponse(user, null);
        }

        var phoneNumber = ParseNumber(request.Phone);

        if (!smsCodeCache.TryGetValue(phoneNumber.ToString(), out string expectedCode))
        {
            throw new UnauthorizedAccessException("Invalid code");
        }

        if (expectedCode != request.Code)
        {
            throw new UnauthorizedAccessException("Invalid code");
        }

        var number = phoneNumber.ToString();

        var collection = mongo.GetCollection<DbUser>();

        var dbUser = (await collection.FindAsync(u => u.Phone == number))
            .FirstOrDefault();

        var (refreshToken, encryptedToken, salt) = GenerateRefreshToken();

        var userId = dbUser?.Id ?? ObjectId.GenerateNewId();

        var update = Builders<DbUser>.Update
            .SetOnInsert(p => p.Phone, number)
            .SetOnInsert(p => p.IsAdmin, false)
            .Set(p => p.RefreshToken, encryptedToken)
            .Set(p => p.Salt, salt)
            .Set(p => p.PushToken, request.PushToken);
        await collection.UpdateOneAsync(u => u.Id == userId, update, new UpdateOptions { IsUpsert = true });

        var authUser = new AuthUser(userId.ToString(), number, dbUser?.IsAdmin ?? false);
        return GenerateAuthResponse(authUser, refreshToken);
    }

    public async Task<AuthResponse> RefreshToken(RefreshTokenRequest request)
    {
        var dbUser = await mongo.GetCollection<DbUser>()
            .Find(u => u.Id == new ObjectId(request.UserId))
            .FirstOrDefaultAsync();

        if (dbUser.RefreshToken is null)
        {
            throw new UnauthorizedAccessException();
        }

        if (dbUser.RefreshToken != HashString(request.RefreshToken, Convert.FromBase64String(dbUser.Salt!)))
        {
            await RevokeRefreshToken(request.UserId);
            throw new UnauthorizedAccessException();
        }

        var (newRefreshToken, encryptedToken, salt) = GenerateRefreshToken();
        await mongo.GetCollection<DbUser>()
            .UpdateOneAsync(u => u.Id == new ObjectId(request.UserId), Builders<DbUser>.Update
                .Set(p => p.RefreshToken, encryptedToken)
                .Set(p => p.Salt, salt));

        var authUser = new AuthUser(request.UserId, dbUser.Phone, dbUser.IsAdmin);
        return GenerateAuthResponse(authUser, newRefreshToken);
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
        await mongo.GetCollection<DbUser>()
            .UpdateOneAsync(u => u.Id == new ObjectId(userId), Builders<DbUser>.Update
                .Unset(u => u.RefreshToken));
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
        var token = new AuthToken(GenerateToken(user), refreshToken);
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

    private static (string refreshToken, string encryptedToken, string salt) GenerateRefreshToken()
    {
        var refreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(KeySize));
        var salt = RandomNumberGenerator.GetBytes(KeySize);
        var encryptedToken = HashString(refreshToken, salt);
        return (refreshToken, Convert.ToBase64String(salt), encryptedToken);
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