using System.Collections.Immutable;
using System.Text.Json;
using DeepEqual.Syntax;
using Liane.Api.Event;
using Liane.Api.Routing;
using Liane.Api.Trip;
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
    var match = new Api.Trip.Match.Compatible(new Delta(0, 0), LabeledPositions.QuezacParking.Id!, LabeledPositions.BalsiegeParkingEglise.Id!, ImmutableList<WayPoint>.Empty);
    var json = JsonSerializer.Serialize<Api.Trip.Match>(match, options);
    Assert.IsTrue(json.Contains("\"type\":\"Compatible\""));
    var actual = JsonSerializer.Deserialize<Api.Trip.Match>(json, options);
    match.WithDeepEqual(actual)
      .Assert();
  }

  [Test]
  public void ShouldDeserializeLianeEvent()
  {
    var lianeEvent = new LianeEvent.MemberHasLeft("lianeId1", "augustin");
    var actual = JsonSerializer.Deserialize<LianeEvent>("{\"type\":\"MemberHasLeft\",\"liane\":\"lianeId1\",\"Member\": \"augustin\"}", options);
    Assert.AreEqual(lianeEvent, actual);
  }
}