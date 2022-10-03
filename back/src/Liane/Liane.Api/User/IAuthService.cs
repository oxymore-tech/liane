using System.Security.Claims;
using System.Threading.Tasks;

namespace Liane.Api.User;

public interface IAuthService
{
    Task SendSms(string phone);

    Task<AuthResponse> Login(string phone, string code);

    Task<AuthResponse> Me();

    ClaimsPrincipal IsTokenValid(string token);
}