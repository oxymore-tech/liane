using System.Net.Http;
using System.Threading.Tasks;
using Liane.Api;
using Liane.Api.Response;
using Liane.Api.Util.Http;
using Microsoft.Extensions.Logging;

namespace Liane.Service.Internal
{
    public sealed class OsrmServiceImpl : IOsrmService
    {
        private readonly HttpClient client;
        private readonly ILogger<OsrmServiceImpl> logger;

        public OsrmServiceImpl(ILogger<OsrmServiceImpl> logger)
        {
            client = new HttpClient();
            this.logger = logger;
        }

        public async Task<Routing> DefaultRouteMethod()
        {

            const string uri = "http://localhost:5000/route/v1/driving/3.4991057,44.5180226;3.57802065202088,44.31901305?geometries=geojson";
            var result = await client.GetAsyncAs<Routing>(uri);
            logger.LogInformation("Call returns ", result);
            return result;
        }


        public async Task<Routing> StepsRouteMethod()
        {
            const string uri = "http://localhost:5000/route/v1/driving/3.4991057,44.5180226;3.57802065202088,44.31901305?steps=true&geometries=geojson";
            var result = await client.GetAsyncAs<Routing>(uri);
            logger.LogInformation("Call returns ", result);
            return result;
        }

        public async Task<Routing> AnnotationsRouteMethod()
        {
            const string uri = "http://localhost:5000/route/v1/driving/3.4991057,44.5180226;3.57802065202088,44.31901305?annotations=true&geometries=geojson";
            var result = await client.GetAsyncAs<Routing>(uri);
            logger.LogInformation("Call returns ", result);
            return result;
        }

        public async Task<Routing> FullOveriewRouteMethod()
        {
            const string uri = "http://localhost:5000/route/v1/driving/3.4991057,44.5180226;3.57802065202088,44.31901305?overview=full&geometries=geojson";
            var result = await client.GetAsyncAs<Routing>(uri);
            logger.LogInformation("Call returns ", result);
            return result;
        }

        public async Task<Routing> NoOverviewRouteMethod()
        {
            const string uri = "http://localhost:5000/route/v1/driving/3.4991057,44.5180226;3.57802065202088,44.31901305?overview=false&geometries=geojson";
            var result = await client.GetAsyncAs<Routing>(uri);
            logger.LogInformation("Call returns ", result);
            return result;
        }
    }
}