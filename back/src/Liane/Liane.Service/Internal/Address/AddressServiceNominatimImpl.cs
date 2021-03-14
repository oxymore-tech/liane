using System.Collections.Immutable;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
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
            var (lat, lon) = coordinate;
            var response = await client.GetFromJsonAsync<Response>("/reverse".WithParams(new
            {
                lat,
                lon,
                format = "json",
                addressdetails = 1
            }));

            if (response == null)
            {
                throw new ResourceNotFoundException("Nominatim");
            }

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
            var responses = await client.GetFromJsonAsync<ImmutableList<Response>>("/search/fr".WithParams(new
            {
                q = displayName,
                format = "json",
                addressdetails = 1
            }));

            if (responses == null)
            {
                throw new ResourceNotFoundException("Nominatim");
            }

            return responses.Select(MapAddress)
                .ToImmutableList();
        }

        private static Api.Address.Address MapAddress(Response r)
        {
            return new(r.DisplayName, new LatLng(r.Lat, r.Lon), r.Icon, r.Address);
        }
    }
}