using System.Text.Json;
using System.Text.Json.Serialization;
using Liane.Service.Internal.Address;
using Liane.Service.Internal.Util;
using Liane.Test.Util;
using NUnit.Framework;

namespace Liane.Test.Internal.Address;

[TestFixture]
public sealed class NominatimJsonTest
{
    [Test]
    public void ShouldDeserializeAddress()
    {
        var options = new JsonSerializerOptions { PropertyNamingPolicy = new SnakeCaseNamingPolicy(), PropertyNameCaseInsensitive = true };
        var actual = JsonSerializer.Deserialize<Api.Address.Address>(AssertExtensions.ReadTestResource("nominatim-address.json"), options);
        Assert.NotNull(actual);
    }

    [Test]
    public void ShouldDeserializeReverseResponse()
    {
        var options = new JsonSerializerOptions { PropertyNamingPolicy = new SnakeCaseNamingPolicy(), PropertyNameCaseInsensitive = true };
        var actual = JsonSerializer.Deserialize<Response>(AssertExtensions.ReadTestResource("nominatim-reverse.json"), options);
        Assert.NotNull(actual);
    }
}