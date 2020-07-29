using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Service.Internal.Osrm;
using Liane.Test.Util;
using Microsoft.Extensions.Logging;
using Moq;
using NUnit.Framework;

namespace Liane.Test
{
    [TestFixture]
    public sealed class OsrmServiceTest
    {
        private readonly OsrmServiceImpl tested;
        private readonly ImmutableList<LatLng> coordinates;

        public OsrmServiceTest()
        {
            tested = new OsrmServiceImpl(new Mock<ILogger<OsrmServiceImpl>>().Object);
            coordinates = ImmutableList.Create(new LatLng(44.5180226, 3.4991057), new LatLng(44.31901305, 3.57802065202088));
        }

        // DONE: test with default routing
        // TODO: test with default routing but no route found
        // TODO: see how waypoints is useful in routing and test it        
        // + Add assertions
        [Test]
        public async Task ShouldGetADefaultRoute()
        {
            var result = await tested.Route(coordinates);
            Console.WriteLine(result.ToString());
        }

        [Test]
        public async Task ShouldGetARouteWithSteps()
        {
            var result = await tested.Route(coordinates, steps: "true");
            Console.WriteLine(result.ToString());
        }

        [Test]
        public async Task ShouldGetRouteWithAnnotations()
        {
            var result = await tested.Route(coordinates, annotations: "true");
            Console.WriteLine(result.ToString());
        }

        [Test]
        public async Task ShouldGetRouteWithFullOverview()
        {
            var result = await tested.Route(coordinates, overview: "full");
            Console.WriteLine(result.ToString());
            Assert.IsNotNull(result.Routes[0].Geometry);
        }

        [Test]
        public async Task ShouldGetRouteWithNoOverview()
        {
            var result = await tested.Route(coordinates, overview: "false");
            Console.WriteLine(result.ToString());
            Assert.IsNull(result.Routes[0].Geometry);
        }
        
        
        [Test]
        public async Task ShouldGetRouteFromMendeToFlorac()
        {
            var route = await tested.Route(ImmutableList.Create(Fixtures.Mende,Fixtures.Florac), overview: "false");
            AssertJson.AreEqual("mende-florac.json", route);
            Assert.IsNotNull(route.Routes[0].Duration);
        }
        [Test]
        public async Task ShouldGetRouteFromMendeToFloracByLeCrouzet()
        {
            var route = await tested.Route(ImmutableList.Create(Fixtures.Mende, Fixtures.LeCrouzet,Fixtures.Florac), overview: "false");

            AssertJson.AreEqual("mende-leCrouzet-florac.json", route);
            Assert.IsNotNull(route.Routes[0].Duration);
        }

        [Test]
        public async Task ShouldGetRouteFromMendeToFloracByGorgesDuTarnCausses()
        {
            var route = await tested.Route(ImmutableList.Create(Fixtures.Mende, Fixtures.GorgesDuTarnCausses,Fixtures.Florac), overview: "false");
            AssertJson.AreEqual("mende-gorgesDuTarnCausses-florac.json", route);
            Assert.IsNotNull(route.Routes[0].Duration);
        }
        
        
    }
}