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

        public async Task<Routing> RouteMethod()
        {
            var result = await client.GetAsyncAs<Routing>("http://localhost:5000/nearest/v1/driving/0,0");
            logger.LogInformation("Call returns ", result);
            return result;
        }
    }
}