using System.Threading.Tasks;

namespace Liane.Api.User
{
    public interface IAuthService
    {
        Task SendSms(string number);
    }
}