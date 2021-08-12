// using System;
// using System.Collections.Immutable;
// using System.Threading.Tasks;
// using Liane.Api.Routing;
// using Liane.Service.Internal.Osrm;
// using Liane.Test.Util;
using NUnit.Framework;

namespace Liane.Test
{
    [TestFixture]
    public sealed class OsrmServiceTest
    {
        // private readonly OsrmServiceImpl tested;
        // private readonly ImmutableList<LatLng> coordinates;
        //
        // public OsrmServiceTest()
        // {
        //     tested = new OsrmServiceImpl(new OsrmSettings(new Uri("http://liane.gjini.co:5000")));
        //     coordinates = ImmutableList.Create(Positions.Mende, Positions.Florac);
        // }

        // [Test]
        // public async Task ShouldGetADefaultRoute()
        // {
        //     var result = await tested.Route(coordinates);
        //     Assert.IsNotNull(result.Routes[0]);
        // }
        //
        // [Test]
        // public async Task ShouldGetARouteWithSteps()
        // {
        //     var result = await tested.Route(coordinates, steps: "true");
        //     Assert.IsNotNull(result.Routes[0].Legs[0].Steps);
        // }
        //
        //
        // [Test]
        // public async Task ShouldGetRouteFromMendeToFlorac()
        // {
        //     var route = await tested.Route(ImmutableList.Create(Positions.Mende, Positions.Florac), overview: "false");
        //     AssertJson.AreEqual("mende-florac.json", route);
        //     Assert.IsNotNull(route.Routes[0].Duration);
        // }
        //
        // [Test]
        // public async Task ShouldGetRouteFromMendeToFloracByGorgesDuTarnCausses()
        // {
        //     var route = await tested.Route(ImmutableList.Create(Positions.Mende, Positions.GorgesDuTarnCausses, Positions.Florac), overview: "false");
        //     AssertJson.AreEqual("mende-gorgesDuTarnCausses-florac.json", route);
        //     Assert.IsNotNull(route.Routes[0].Duration);
        // }
        //
        // [Test]
        // public async Task ShouldGetRouteFromMendeToFloracByLeCrouzet()
        // {
        //     var route = await tested.Route(ImmutableList.Create(Positions.Mende, Positions.LeCrouzet, Positions.Florac), overview: "false");
        //
        //     AssertJson.AreEqual("mende-leCrouzet-florac.json", route);
        //     Assert.IsNotNull(route.Routes[0].Duration);
        // }
        //
        //
        // [Test]
        // public async Task ShouldGetRouteFromMendeToFloracByGorgesDuTarnCaussesAndPrades()
        // {
        //     var route = await tested.Route(ImmutableList.Create(Positions.Mende, Positions.GorgesDuTarnCausses, Positions.Prades, Positions.Florac), overview: "false");
        //
        //     AssertJson.AreEqual("mende-gorgesDuTarnCausses-prades-florac.json", route);
        //     Assert.IsNotNull(route.Routes[0].Duration);
        // }
        //
        // [Test]
        // public async Task ShouldGetRouteFromMendeToFloracByLeCrouzetAndCocures()
        // {
        //     var route = await tested.Route(ImmutableList.Create(Positions.Mende, Positions.LeCrouzet, Positions.Cocures, Positions.Florac), overview: "false");
        //
        //     AssertJson.AreEqual("mende-leCrouzet-cocures-florac.json", route);
        //     Assert.IsNotNull(route.Routes[0].Duration);
        // }
        //
        // [Test]
        // public async Task ShouldGetRouteFromMendeToFloracByLeCrouzetAndRampon()
        // {
        //     var route = await tested.Route(ImmutableList.Create(Positions.Mende, Positions.LeCrouzet, Positions.Rampon, Positions.Florac), overview: "false");
        //
        //     AssertJson.AreEqual("mende-leCrouzet-rampon-florac.json", route);
        //     Assert.IsNotNull(route.Routes[0].Duration);
        // }
        //
        //
        // [Test]
        // public async Task ShouldGetRouteWithAnnotations()
        // {
        //     var result = await tested.Route(coordinates, annotations: "true");
        //     Assert.IsNotNull(result.Routes[0].Legs[0].Annotation);
        // }
        //
        // [Test]
        // public async Task ShouldGetRouteWithFullOverview()
        // {
        //     var result = await tested.Route(coordinates, overview: "full");
        //     Assert.IsNotNull(result.Routes[0].Geometry);
        // }
        //
        // [Test]
        // public async Task ShouldGetRouteWithNoOverview()
        // {
        //     var result = await tested.Route(coordinates, overview: "false");
        //     Console.WriteLine(result.ToString());
        //     Assert.IsNull(result.Routes[0].Geometry);
        // }
    }
}