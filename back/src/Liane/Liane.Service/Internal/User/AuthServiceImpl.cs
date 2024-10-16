using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Liane.Api.Auth;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.Internal.User;

public sealed class AuthServiceImpl : IAuthService
{
  public const string AdminRole = "admin";

  private const string UserRole = "user";
  private const int KeySize = 64;
  private static readonly Regex ValidPhoneNumber = new(@"^\+33|06|07");

  private static readonly JwtSecurityTokenHandler JwtTokenHandler = new();
  private readonly ILogger<AuthServiceImpl> logger;
  private readonly AuthSettings authSettings;
  private readonly SymmetricSecurityKey signinKey;
  private readonly MemoryCache smsCodeCache = new(new MemoryCacheOptions());
  private readonly IMongoDatabase mongo;
  private readonly SmsSender smsSender;

  public AuthServiceImpl(ILogger<AuthServiceImpl> logger, AuthSettings authSettings, IMongoDatabase mongo, SmsSender smsSender)
  {
    this.mongo = mongo;
    this.smsSender = smsSender;
    this.logger = logger;
    this.authSettings = authSettings;
    var keyByteArray = Encoding.ASCII.GetBytes(authSettings.SecretKey);
    signinKey = new SymmetricSecurityKey(keyByteArray);
  }

  public async Task SendSms(string phone)
  {
    if (authSettings.TestAccount != null && phone.Equals(authSettings.TestAccount))
    {
      // Ignore this step for demo account
      return;
    }

    if (!ValidPhoneNumber.IsMatch(phone))
    {
      throw new ArgumentException("Invalid phone number");
    }

    var phoneNumber = phone.ToPhoneNumber();

    if (smsCodeCache.TryGetValue($"attempt:{phoneNumber}", out _))
    {
      throw new UnauthorizedAccessException("Too many requests");
    }

    if (authSettings.Cooldown > 0)
    {
      smsCodeCache.Set($"attempt:{phoneNumber}", true, TimeSpan.FromSeconds(authSettings.Cooldown));
    }

    if (authSettings.Disabled)
    {
      return;
    }

    var generator = new Random();
    var code = generator.Next(0, 1000000).ToString("D6");

    smsCodeCache.Set(phoneNumber, code, TimeSpan.FromMinutes(2));

    await smsSender.Send(phoneNumber, $"{code} est votre code liane");
  }

  public async Task<AuthResponse> Login(AuthRequest request)
  {
    var (number, isAdmin) = Authenticate(request);

    var collection = mongo.GetCollection<DbUser>();

    var dbUser = await collection.Find(u => u.Phone == number)
      .FirstOrDefaultAsync();

    var (refreshToken, encryptedToken, salt) = GenerateRefreshToken();

    var userId = dbUser?.Id ?? ObjectId.GenerateNewId().ToString()!;

    var createdAt = DateTime.UtcNow;
    var update = Builders<DbUser>.Update
      .SetOnInsert(p => p.Phone, number)
      .SetOnInsert(p => p.IsAdmin, isAdmin)
      .SetOnInsert(p => p.CreatedAt, createdAt)
      .Set(p => p.PushToken, request.PushToken);

    if (request.WithRefresh)
    {
      update = update.Set(p => p.RefreshToken, encryptedToken).Set(p => p.Salt, salt);
    }

    await collection.UpdateOneAsync(u => u.Id == userId, update, new UpdateOptions { IsUpsert = true });

    var authUser = new AuthUser(userId, dbUser?.IsAdmin ?? isAdmin, dbUser?.UserInfo is not null);
    return GenerateAuthResponse(authUser, request.WithRefresh ? refreshToken : null);
  }

  private (string, bool) Authenticate(AuthRequest request)
  {
    var phoneNumber = request.Phone.ToPhoneNumber();
    var testAccountPhoneNumber = authSettings.TestAccount?.ToPhoneNumber();

    if ((authSettings.Disabled && request.Code.Equals(authSettings.TestCode)) || (phoneNumber == testAccountPhoneNumber && request.Code.Equals(authSettings.TestCode)))
    {
      return (phoneNumber, true);
    }

    if (!smsCodeCache.TryGetValue(phoneNumber, out string? expectedCode))
    {
      throw new UnauthorizedAccessException("Invalid code");
    }

    if (expectedCode != request.Code)
    {
      throw new UnauthorizedAccessException("Invalid code");
    }

    return (phoneNumber, false);
  }

  public async Task<AuthResponse> RefreshToken(RefreshTokenRequest request)
  {
    var dbUser = await mongo.GetCollection<DbUser>()
      .Find(u => u.Id == request.UserId)
      .FirstOrDefaultAsync();

    if (dbUser?.RefreshToken is null)
    {
      throw new UnauthorizedAccessException("Invalid refresh token");
    }

    if (dbUser.RefreshToken != HashString(request.RefreshToken, Convert.FromBase64String(dbUser.Salt!)))
    {
      await RevokeRefreshToken(request.UserId);
      throw new UnauthorizedAccessException("Invalid refresh token");
    }

    var (newRefreshToken, encryptedToken, salt) = GenerateRefreshToken();
    await mongo.GetCollection<DbUser>()
      .UpdateOneAsync(u => u.Id == request.UserId, Builders<DbUser>.Update
        .Set(p => p.RefreshToken, encryptedToken)
        .Set(p => p.Salt, salt));

    var authUser = new AuthUser(request.UserId, dbUser.IsAdmin, dbUser.UserInfo is not null);
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
      .UpdateOneAsync(u => u.Id == userId, Builders<DbUser>.Update
        .Unset(u => u.RefreshToken));
  }

  public async Task Logout(Ref<Api.Auth.User> user)
  {
    await RevokeRefreshToken(user.Id);
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
    return (refreshToken, encryptedToken, Convert.ToBase64String(salt));
  }

  private string GenerateToken(AuthUser user)
  {
    var claims = new List<Claim>
    {
      new(ClaimTypes.Name, user.Id),
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