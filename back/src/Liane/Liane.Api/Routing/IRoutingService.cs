using System.Threading.Tasks;

namespace Liane.Api.Routing
{
    public interface IRoutingService
    {
        Task<Route> BasicRouteMethod(RoutingQuery routingQuery);

        // TODO customized scenario method
    }
}