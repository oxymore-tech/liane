using System.Threading.Tasks;
using System.Net.Http;
using Liane.Api.Util.Http;
using Microsoft.Extensions.Logging;

namespace Liane.Service.Internal.Nominatim
{
    public class NominatimServiceImpl : INominatimService
    {
        private readonly HttpClient client;
        private readonly ILogger<NominatimServiceImpl> logger;
        
        public NominatimServiceImpl(ILogger<NominatimServiceImpl> logger)
        {
            client = new HttpClient();
            this.logger = logger;
        }
        
        // http://nominatim.openstreetmap.org/search/gb/birmingham/pilkington%20avenue/135?format=xml&polygon=1&addressdetails=1
        public async Task<Response> Search()
        {
            string uri = $"http://liane.gjini.co:7070/search/fr/florac/florac/?format=json";

            logger.LogInformation("Call returns ", uri);

            var result = await client.GetAsyncAs<Response>(uri);
            logger.LogInformation("Call returns ", result);
            return result;
        }
    }
}