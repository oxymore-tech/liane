using System.Threading.Tasks;
using Liane.Api.Response;

namespace Liane.Api
{
    public interface IOsrmService
    {
        Task<Routing> RouteMethod();
        
        // TODO customized scenario method
        
    }
}