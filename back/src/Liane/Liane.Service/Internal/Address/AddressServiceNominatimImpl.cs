using System;
using System.Collections.Immutable;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Liane.Api.Address;
using Liane.Api.Routing;
using Liane.Api.Util.Exception;
using Liane.Api.Util.Http;
using Liane.Service.Internal.Util;

namespace Liane.Service.Internal.Address;

public sealed class AddressServiceNominatimImpl : IAddressService
{
    private readonly HttpClient client;
    private static readonly JsonSerializerOptions JSON_OPTIONS = new() {PropertyNamingPolicy = new SnakeCaseNamingPolicy(), IgnoreNullValues = true, PropertyNameCaseInsensitive = true};

    public AddressServiceNominatimImpl(NominatimSettings settings)
    {
        client = new HttpClient {BaseAddress = settings.Url};
    }

    public async Task<AddressResponse> GetDisplayName(LatLng coordinate)
    {
        var (lat, lon) = coordinate;
        var response = await client.GetFromJsonAsync<Response>("/reverse".WithParams(new
        {
            lat,
            lon,
            format = "jsonv2",
            addressdetails = 1
        }), JSON_OPTIONS);

        if (response == null)
        {
            throw new ResourceNotFoundException("Nominatim");
        }

        return MapAddress(response);
    }

    public async Task<AddressResponse> GetCoordinate(string displayName)
    {
        var addresses = await Search(displayName);
        if (addresses.IsEmpty)
        {
            throw new ResourceNotFoundException($"Address '{displayName}' not found");
        }

        return addresses[0];
    }

    public async Task<ImmutableList<AddressResponse>> Search(string displayName)
    {
        var uri = "/search/fr".WithParams(new
        {
            q = displayName,
            format = "jsonv2",
            addressdetails = 1
        });
        var responses = await client.GetFromJsonAsync<ImmutableList<Response>>(uri, JSON_OPTIONS);

        if (responses == null)
        {
            throw new ResourceNotFoundException("Nominatim");
        }

        return responses.Select(MapAddress)
            .ToImmutableList();
    }

    private static AddressResponse MapAddress(Response r)
    {
        var city = r.Address.Village ?? r.Address.City;
        var road = string.Join(", ", ImmutableList.Create(r.Address.Road, r.Address.Hamlet).Where(s => s != null));
        var street = r.Address.HouseNumber != null ? $"{r.Address.HouseNumber} {road}" : road;
        var address = new Api.Address.Address(street, r.Address.Postcode!, city!, r.Address.Country, r.Address.CountryCode);
        return new(new LatLng(Convert.ToDouble(r.Lat), Convert.ToDouble(r.Lon)), r.DisplayName, address);
    }
}