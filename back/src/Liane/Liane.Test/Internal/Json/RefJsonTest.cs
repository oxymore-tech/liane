using System.Text.Json;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Web.Internal.Json;
using NUnit.Framework;

namespace Liane.Test.Internal.Json;

[TestFixture]
public sealed class RefJsonTest
{
  private readonly JsonSerializerOptions options = JsonSerializerSettings.TestJsonOptions(false);

  private record DummyDto(Ref<RallyingPoint> RallyingPoint);

  private record DummyDtoWithResolvedRef(
    [property: SerializeAsResolvedRef] Ref<RallyingPoint> RallyingPoint
  );

  [Test]
  public void ShouldSerializeAnnotatedRefAsUnresolved()
  {
    var value = new DummyDto(LabeledPositions.Cocures);
    var actual = JsonSerializer.Serialize(value, options);
    Assert.AreEqual("{\"rallyingPoint\":\"Cocures\"}", actual);
  }

  [Test]
  public void ShouldSerializeAnnotatedRefAsResolved()
  {
    var rallyingPoint = (Ref<RallyingPoint>)new RallyingPoint("33", "Mende", new LatLng(30.0, 12.0), LocationType.CarpoolArea, "", "15000", "", null, true);
    var value = new DummyDtoWithResolvedRef(rallyingPoint);
    var actual = JsonSerializer.Serialize(value, options);
    Assert.AreEqual(
      "{\"rallyingPoint\":{\"id\":\"33\",\"label\":\"Mende\",\"location\":{\"lat\":30,\"lng\":12},\"type\":\"CarpoolArea\",\"address\":\"\",\"zipCode\":\"15000\",\"city\":\"\",\"placeCount\":null,\"isActive\":true}}",
      actual);
  }

  [Test]
  public void ShouldSerializeUnresolvedRef()
  {
    var actual = JsonSerializer.Serialize((Ref<RallyingPoint>)"XXX", options);
    Assert.AreEqual("\"XXX\"", actual);
  }

  [Test]
  public void ShouldDeserializeUnresolvedRef()
  {
    var actual = JsonSerializer.Deserialize<Ref<RallyingPoint>>("\"AAA\"", options);
    Assert.AreEqual((Ref<RallyingPoint>)"AAA", actual);
  }

  [Test]
  public void ShouldSerializeResolvedRef()
  {
    var actual = JsonSerializer.Serialize((Ref<RallyingPoint>)new RallyingPoint("33", "Mende", new LatLng(30.0, 12.0), LocationType.CarpoolArea, "", "15000", "", null, true), options);
    Assert.AreEqual(
      "{\"id\":\"33\",\"label\":\"Mende\",\"location\":{\"lat\":30,\"lng\":12},\"type\":\"CarpoolArea\",\"address\":\"\",\"zipCode\":\"15000\",\"city\":\"\",\"placeCount\":null,\"isActive\":true}",
      actual);
  }

  [Test]
  public void ShouldDeserializeResolvedRef()
  {
    var actual = JsonSerializer.Deserialize<Ref<RallyingPoint>>(
      "{\"id\":\"33\",\"label\":\"Mende\",\"location\":{\"lat\":30,\"lng\":12},\"type\":\"CarpoolArea\",\"address\":\"\",\"zipCode\":\"15000\",\"city\":\"\",\"placeCount\":null,\"isActive\":true}",
      options);
    Assert.AreEqual((Ref<RallyingPoint>)new RallyingPoint("33", "Mende", new LatLng(30.0, 12.0), LocationType.CarpoolArea, "", "15000", "", null, true), actual);
  }
}