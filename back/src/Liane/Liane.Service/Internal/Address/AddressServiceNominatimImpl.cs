using System.Collections.Immutable;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Liane.Api.Address;
using Liane.Api.Routing;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Http;
using Microsoft.Extensions.Logging;

namespace Liane.Service.Internal.Address
{
    public sealed class AddressServiceNominatimImpl : IAddressService
    {
        private readonly HttpClient client;
        private readonly ILogger<AddressServiceNominatimImpl> logger;

        public AddressServiceNominatimImpl(ILogger<AddressServiceNominatimImpl> logger, NominatimSettings settings)
        {
            client = new HttpClient {BaseAddress = settings.Url};
            this.logger = logger;
        }

        public async Task<Api.Address.Address> GetDisplayName(LatLng coordinate)
        {
            var response = await client.GetAsyncAs<Response>("/reverse", new
            {
                lat = coordinate.Lat,
                lon = coordinate.Lng,
                format = "json",
                addressdetails = 1
            });

            return MapAddress(response);
        }

        public async Task<Api.Address.Address> GetCoordinate(string displayName)
        {
            var addresses = await Search(displayName);
            if (addresses.IsEmpty)
            {
                throw new ResourceNotFoundException($"Address '{displayName}' not found");
            }

            return addresses[0];
        }

        public async Task<ImmutableList<Api.Address.Address>> Search(string displayName)
        {
            var responses = await client.GetAsyncAs<ImmutableList<Response>>("/search/fr", new
            {
                q = displayName,
                format = "json",
                addressdetails = 1
            });

            logger.LogInformation("Call returns ", responses);

            return responses.Select(MapAddress)
                .ToImmutableList();
        }

        private static Api.Address.Address MapAddress(Response r)
        {
            return new Api.Address.Address(r.DisplayName, new LatLng(r.Lat, r.Lon),r.Icon, r.Address);
        }
    }
}