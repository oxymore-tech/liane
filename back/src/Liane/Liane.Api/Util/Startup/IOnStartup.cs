using System.Threading.Tasks;

namespace Liane.Api.Util.Startup
{
    public interface IOnStartup
    {
        Task OnStartup();
    }
}