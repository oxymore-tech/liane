using System.Net.Http;
using System.Threading.Tasks;
using Liane.Api.Address;
using Liane.Api.Routing;
using Liane.Api.Util.Http;
using Liane.Service.Internal.Nominatim;
using Microsoft.Extensions.Logging;

namespace Liane.Service.Internal.Address
{
    public sealed class AddressServiceNominatimImpl : IAddressServiceNominatim
    {
        private readonly HttpClient client;
        private readonly ILogger<AddressServiceNominatimImpl> logger;

        public AddressServiceNominatimImpl(ILogger<AddressServiceNominatimImpl> logger)
        {
            client = new HttpClient();
            this.logger = logger;
        }

        public async Task<Api.Address.Address> GetDisplayName(LatLng coordinate)
        {
            string uri = $"http://liane.gjini.co:7070/search/fr/reverse";

            var response = await client.GetAsyncAs<Response>(uri, new
            {
                lat = coordinate.Lat,
                lon = coordinate.Lng,
                format = "json"
            });

            logger.LogInformation("Call returns ", response);

            return new Api.Address.Address(response.DisplayName, new LatLng(response.Lat, response.Lng));
        }

        public async Task<Api.Address.Address> GetCoordinate(string displayName)
        {
            string uri = $"http://liane.gjini.co:7070/search/fr";

            var response = await client.GetAsyncAs<Response>(uri, new
            {
                q = displayName,
                format = "json"
            });


            logger.LogInformation("Call returns ", response);

            return new Api.Address.Address(response.DisplayName, new LatLng(response.Lat, response.Lng));
        }
    }
}