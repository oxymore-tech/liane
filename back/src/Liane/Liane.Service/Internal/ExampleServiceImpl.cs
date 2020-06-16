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

        public async Task<bool> ExampleMethod()
        {
            var result = await client.GetAsyncAs<bool>("https://url");
            logger.LogInformation("Call returns ", result);
            return result;
        }
    }
}