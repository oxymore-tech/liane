using System.Text.Json;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Util;
using Liane.Web.Internal.Json;
using NUnit.Framework;
using YamlDotNet.Serialization.NamingConventions;

namespace Liane.Test.Internal.Json;

[TestFixture]
public sealed class UnionTypeJsonTest
{
    private readonly JsonSerializerOptions options = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, PropertyNameCaseInsensitive = true, Converters = { new RefJsonConverterFactory() }, TypeInfoResolver = new PolymorphicTypeResolver()};

    [Test]
    public void ShouldSerialize()
    {
      var match = new CompatibleMatch(0);
      var actual = JsonSerializer.Serialize<MatchType>(match, options);
        Assert.AreEqual("{\"type\":\"CompatibleMatch\",\"deltaInSeconds\":0}", actual);
    }

}