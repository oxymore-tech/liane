using System.Threading.Tasks;
using System.Net.Http;
using Liane.Api.Routing;
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
        public async Task<Response> AddressSearch(LatLng coord)
        {
            string uri = $"http://liane.gjini.co:7070/search/fr/{coord.ToLngLatString()}?format=json";

            logger.LogInformation("Call returns ", uri);

            var result = await client.GetAsyncAs<Response>(uri);
            logger.LogInformation("Call returns ", result);
            return result;
        }

        public async Task<Response> CoordSearch(string address)
        {
            string uri = $"http://liane.gjini.co:7070/search/fr/{address}?format=json";
            
            logger.LogInformation("Call returns ", uri);

            var result = await client.GetAsyncAs<Response>(uri);
            logger.LogInformation("Call returns ", result);
            return result;
        }
    }
}