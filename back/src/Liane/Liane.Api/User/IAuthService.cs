using System.Security.Claims;
using System.Threading.Tasks;

namespace Liane.Api.User
{
    public interface IAuthService
    {
        Task SendSms(string number);
        Task<string> Login(string number, string code);
        ClaimsPrincipal IsTokenValid(string token);
    }
}