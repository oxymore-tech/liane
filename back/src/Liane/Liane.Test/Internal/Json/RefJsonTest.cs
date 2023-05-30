using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Util;
using Liane.Web.Internal.Json;
using NUnit.Framework;

namespace Liane.Test.Internal.Json;

[TestFixture]
public sealed class RefJsonTest
{
    private readonly JsonSerializerOptions options = new() { 
      PropertyNamingPolicy = new SnakeCaseNamingPolicy(),
      PropertyNameCaseInsensitive = true, 
      Converters = { new RefJsonConverterFactory() }, 
      TypeInfoResolver = new DefaultJsonTypeInfoResolver
    {
      Modifiers = { RefJsonStrategy.CreateRefResolutionModifier(new SnakeCaseNamingPolicy()) }
    }};

    private record DummyDto(
      Ref<RallyingPoint> rallyingPoint
      );
    private record DummyDtoWithResolvedRef(
      [property: SerializeAsResolvedRef]
      Ref<RallyingPoint> rallyingPoint
    );
    
    [Test]
    public void ShouldSerializeAnnotatedRefAsUnresolved()
    {
      var value = new DummyDto(LabeledPositions.Cocures);
      var actual = JsonSerializer.Serialize(value, options);
      Assert.AreEqual("{\"rallying_point\":\"Cocures_fakeId\"}", actual);
    }
    
    [Test]
    public void ShouldSerializeAnnotatedRefAsResolved()
    {
      var rallyingPoint = (Ref<RallyingPoint>)new RallyingPoint("33", "Mende", new LatLng(30.0, 12.0), LocationType.CarpoolArea, "", "15000", "", null, true);
      var value = new DummyDtoWithResolvedRef(rallyingPoint);
      var actual = JsonSerializer.Serialize(value, options);
      Assert.AreEqual("{\"rallying_point\":{\"id\":\"33\",\"label\":\"Mende\",\"location\":{\"lat\":30,\"lng\":12},\"type\":1,\"address\":\"\",\"zip_code\":\"15000\",\"city\":\"\",\"place_count\":null,\"is_active\":true}}", actual);
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
        Assert.AreEqual("{\"id\":\"33\",\"label\":\"Mende\",\"location\":{\"lat\":30,\"lng\":12},\"type\":1,\"address\":\"\",\"zip_code\":\"15000\",\"city\":\"\",\"place_count\":null,\"is_active\":true}", actual);
    }

    [Test]
    public void ShouldDeserializeResolvedRef()
    {
        var actual = JsonSerializer.Deserialize<Ref<RallyingPoint>>("{\"id\":\"33\",\"label\":\"Mende\",\"location\":{\"lat\":30,\"lng\":12},\"type\":1,\"address\":\"\",\"zip_code\":\"15000\",\"city\":\"\",\"place_count\":null,\"is_active\":true}", options);
        Assert.AreEqual((Ref<RallyingPoint>)new RallyingPoint("33", "Mende", new LatLng(30.0, 12.0), LocationType.CarpoolArea, "", "15000", "", null, true), actual);
    }
}