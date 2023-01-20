using System.Security.Claims;
using System.Threading.Tasks;

namespace Liane.Api.User;

public interface IAuthService
{
    Task SendSms(string phone);

    Task<AuthResponse> Login(string phone, string code, string? pushToken);

    //Task<AuthUser> Me();
    
    Task Logout();
    
    Task<AuthResponse> RefreshToken(string userId, string refreshToken);

    ClaimsPrincipal IsTokenValid(string token);
}