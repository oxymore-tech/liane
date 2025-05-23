using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Service.Internal.Osrm;
using Liane.Test.Util;
using NUnit.Framework;

namespace Liane.Test;

[TestFixture(Category = "Integration")]
public sealed class OsrmServiceTest
{
  private readonly IOsrmService tested = new OsrmClient(new OsrmSettings(new Uri("http://gjini.co:5000")));
  private readonly ImmutableList<LatLng> coordinates = ImmutableList.Create(Positions.Mende, Positions.Florac);

  [Test]
  public async Task ShouldGetADefaultRoute()
  {
    var result = await tested.Route(coordinates);
    Assert.IsNotNull(result.Routes[0]);
  }

  [Test]
  public async Task ShouldGetARouteWithSteps()
  {
    var result = await tested.Route(coordinates, steps: "true");
    Assert.IsNotNull(result.Routes[0].Legs[0].Steps);
  }


  [Test]
  public async Task ShouldGetRouteFromMendeToFlorac()
  {
    var route = await tested.Route(ImmutableList.Create(Positions.Mende, Positions.Florac), overview: "false");
    AssertJson.AreEqual("mende-florac.json", route);
    Assert.IsNotNull(route.Routes[0].Duration);
  }

  [Test]
  public async Task ShouldGetRouteFromMendeToFloracByGorgesDuTarnCausses()
  {
    var route = await tested.Route(ImmutableList.Create(Positions.Mende, Positions.GorgesDuTarnCausses, Positions.Florac), overview: "false");
    AssertJson.AreEqual("mende-gorgesDuTarnCausses-florac.json", route);
    Assert.IsNotNull(route.Routes[0].Duration);
  }

  [Test]
  public async Task ShouldGetRouteWithAnnotations()
  {
    var result = await tested.Route(coordinates, annotations: "true");
    Assert.IsNotNull(result.Routes[0].Legs[0].Annotation);
  }

  [Test]
  public async Task ShouldGetRouteWithFullOverview()
  {
    var result = await tested.Route(coordinates, overview: "full");
    Assert.IsNotNull(result.Routes[0].Geometry);
  }

  [Test]
  public async Task ShouldGetRouteWithNoOverview()
  {
    var result = await tested.Route(coordinates, overview: "false");
    Assert.IsNull(result.Routes[0].Geometry);
  }
}