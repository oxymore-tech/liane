using System.Collections.Immutable;
using System.Text.Json;
using DeepEqual.Syntax;
using Liane.Api.Event;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
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
  public void ShouldFailToDeserializeLianeEventWithMissingTypeInfo()
  {
    Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<LianeEvent>("{\"liane\":\"lianeId1\",\"Member\": \"augustin\"}", options));
  }

  [Test]
  public void ShouldSerializeConcrete1()
  {
    var test = new RootUnionType.Concrete1();
    var actual = JsonSerializer.Serialize(test, options);
    Assert.AreEqual("{\"type\":\"Concrete1\"}", actual);
  }

  [Test]
  public void ShouldDeserializeConcrete1()
  {
    var actual = JsonSerializer.Deserialize<RootUnionType>("{\"type\":\"Concrete1\"}", options);
    var expected = new RootUnionType.Concrete1();
    Assert.AreEqual(expected, actual);
  }

  [Test]
  public void ShouldSerializeConcrete2()
  {
    var test = new RootUnionType.Concrete2();
    var actual = JsonSerializer.Serialize(test, options);
    Assert.AreEqual("{\"type\":\"Concrete2\"}", actual);
  }

  [Test]
  public void ShouldDeserializeConcrete2()
  {
    var actual = JsonSerializer.Deserialize<RootUnionType>("{\"type\":\"Concrete2\"}", options);
    var expected = new RootUnionType.Concrete2();
    Assert.AreEqual(expected, actual);
  }

  [Test]
  public void ShouldDeserializeConcrete3WithDefaultValue()
  {
    var actual = JsonSerializer.Deserialize<RootUnionType>("{\"type\":\"Concrete3\"}", options);
    var expected = new RootUnionType.Concrete3();
    Assert.AreEqual(expected, actual);
    Assert.AreEqual(33, ((RootUnionType.Concrete3)actual!).Test);
  }

  [Union]
  internal abstract record RootUnionType
  {
    internal abstract record Abstract1 : RootUnionType;

    internal sealed record Concrete1 : RootUnionType;

    internal sealed record Concrete2 : Abstract1;

    internal sealed record Concrete3(int Test = 33) : Abstract1;
  }
}