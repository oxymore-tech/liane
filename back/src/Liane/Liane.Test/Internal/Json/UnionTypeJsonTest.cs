using System;
using System.Text.Json;
using Liane.Api.Notification;
using Liane.Api.Trip;
using Liane.Service.Internal.Util;
using Liane.Web.Internal.Json;
using NUnit.Framework;

namespace Liane.Test.Internal.Json;

[TestFixture]
public sealed class UnionTypeJsonTest
{
    private readonly JsonSerializerOptions options = new()
    {
      PropertyNamingPolicy = new SnakeCaseNamingPolicy(), 
      PropertyNameCaseInsensitive = true, 
      Converters = { new RefJsonConverterFactory(), new NotificationJsonConverter() }, 
      TypeInfoResolver = new PolymorphicTypeResolver(),
    };

    [Test]
    public void ShouldSerializeMatchType()
    {
      var match = new MatchType.CompatibleMatch(0);
      var actual = JsonSerializer.Serialize<MatchType>(match, options);
        Assert.AreEqual("{\"type\":\"CompatibleMatch\",\"delta_in_seconds\":0}", actual);
    }

    [Test]
    public void ShouldDeserializeLianeEvent()
    {
      var lianeEvent = new LianeEvent.NewMember("id", DateTime.Parse("2023-03-03"), "some_id", "some_other_id");
      var strValue = "{\"type\":\"NewMember\",\"liane\":\"some_other_id\",\"id\":\"id\",\"created_at\":\"2023-03-03T00:00:00\",\"created_by\":\"some_id\"}";
      var actual = JsonSerializer.Deserialize<LianeEvent>(strValue, options);
      Assert.AreEqual(lianeEvent, actual);
    }
}