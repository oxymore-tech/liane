using System.Text.Json;
using Liane.Api.Event;
using Liane.Web.Internal.Json;
using NUnit.Framework;

namespace Liane.Test.Internal.Json;

[TestFixture]
public sealed class UnionTypeJsonTest
{
  private readonly JsonSerializerOptions options = JsonSerializerSettings.TestJsonOptions(false);

  [Test]
  public void ShouldSerializeMatchType()
  {
    var match = new Api.Trip.Match.Compatible(0);
    var actual = JsonSerializer.Serialize<Api.Trip.Match>(match, options);
    Assert.AreEqual("{\"type\":\"Compatible\",\"deltaInSeconds\":0}", actual);
  }

  [Test]
  public void ShouldDeserializeLianeEvent()
  {
    var lianeEvent = new LianeEvent.MemberHasLeft();
    var actual = JsonSerializer.Deserialize<LianeEvent>("{\"type\":\"MemberHasLeft\"}", options);
    Assert.AreEqual(lianeEvent, actual);
  }
}