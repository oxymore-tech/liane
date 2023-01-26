using System.Security.Claims;
using System.Threading.Tasks;

namespace Liane.Api.User;

public interface IAuthService
{
    Task SendSms(string phone);

    Task<AuthResponse> Login(AuthRequest request);
    
    Task Logout();
    
    Task<AuthResponse> RefreshToken(RefreshTokenRequest request);

    ClaimsPrincipal IsTokenValid(string token);
}