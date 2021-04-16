using System.Security.Claims;
using System.Threading.Tasks;

namespace Liane.Api.User
{
    public interface IAuthService
    {
        Task SendSms(string phone);
        Task<AuthUser> Login(string phone, string code, string token);
        ClaimsPrincipal IsTokenValid(string token);
        Task<AuthUser> Me();
    }
}