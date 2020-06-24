using System.Threading.Tasks;
using Liane.Api.Response;

namespace Liane.Api
{
    public interface IOsrmService
    {
        Task<Routing> DefaultRouteMethod();
        
        // TODO customized scenario method
        
    }
}