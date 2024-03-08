using System.Security.Claims;
using System.Threading.Tasks;
using Liane.Api.Util.Ref;

namespace Liane.Api.Auth;

public interface IAuthService
{
    Task SendSms(string phone);

    Task<AuthResponse> Login(AuthRequest request);
    
    Task Logout(Ref<User> user);
    
    Task<AuthResponse> RefreshToken(RefreshTokenRequest request);

    ClaimsPrincipal IsTokenValid(string token);
}