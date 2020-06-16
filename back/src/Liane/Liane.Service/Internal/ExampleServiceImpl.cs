using System.Net.Http;
using System.Threading.Tasks;
using Liane.Api;
using Liane.Api.Util.Http;
using Microsoft.Extensions.Logging;

namespace Liane.Service.Internal
{
    public sealed class ExampleServiceImpl : IExampleService
    {
        private readonly HttpClient client;
        private readonly ILogger<ExampleServiceImpl> logger;

        public ExampleServiceImpl(ILogger<ExampleServiceImpl> logger)
        {
            client = new HttpClient();
            this.logger = logger;
        }

        public async Task<Route> ExampleMethod()
        {
            var result = await client.GetAsyncAs<Route>("http://localhost:5000/nearest/v1/driving/0,0");
            logger.LogInformation("Call returns ", result);
            return result;
        }
    }
}