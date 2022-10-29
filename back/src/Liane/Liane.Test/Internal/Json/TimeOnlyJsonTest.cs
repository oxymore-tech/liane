using System;
using System.Text.Json;
using Liane.Service.Internal.Util;
using Liane.Web.Internal.Json;
using NUnit.Framework;

namespace Liane.Test.Internal.Json;

[TestFixture]
public sealed class TimeOnlyJsonTest
{
    private readonly JsonSerializerOptions options = new() { PropertyNamingPolicy = new SnakeCaseNamingPolicy(), PropertyNameCaseInsensitive = true, Converters = { new TimeOnlyJsonConverter() } };

    [Test]
    public void ShouldSerializeTimeOnly()
    {
        var actual = JsonSerializer.Serialize(new TimeOnly(9, 10), options);
        Assert.AreEqual("{\"hour\":9,\"minute\":10}", actual);
    }

    [Test]
    public void ShouldDeserializeTimeOnly()
    {
        var actual = JsonSerializer.Deserialize<TimeOnly>("{\"hour\":10,\"minute\":45}", options);
        Assert.AreEqual(new TimeOnly(10, 45), actual);
    }
}