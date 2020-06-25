using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Service.Internal;
using Microsoft.Extensions.Logging;
using Moq;
using NUnit.Framework;

namespace Liane.Test
{
    [TestFixture]
    public sealed class RoutingTest
    {
        [SetUp]
        public void SetUp()
        {
        }

        [TearDown]
        public void TearDown()
        {
        }

// SIMPLE ROUTE
        // DONE: test with default routing
        // TODO: test with default routing but no route found
        // TODO: test with steps=true
        // TODO: test with annotations=true
        // TODO: test with overview=full
        // TODO: test with overview=false
        // TODO: see how waypoints is useful in routing and test it        
        // + Add assertions
        [Test]
        public async Task ShouldGetADefaultRoute()
        {
        // Default route resquest : All options have default values except for geometries=geojson
        var service = new OsrmServiceImpl(new Mock<ILogger<OsrmServiceImpl>>().Object);
            
        var coordinates = ImmutableList.Create(ImmutableList.Create(3.4991057, 44.5180226),
            ImmutableList.Create(3.57802065202088, 44.31901305));
        var result = await service.RouteRequest(coordinates);
        Console.WriteLine(result.ToString());
        }

        [Test]
        public async Task ShouldGetARouteWithSteps()
        {
            var service = new OsrmServiceImpl(new Mock<ILogger<OsrmServiceImpl>>().Object);
            
            var coordinates = ImmutableList.Create(ImmutableList.Create(3.4991057, 44.5180226),
                ImmutableList.Create(3.57802065202088, 44.31901305));
            var result = await service.RouteRequest(coordinates,steps:"true");
            Console.WriteLine(result.ToString());
        }
        
        [Test]
        public async Task ShouldGetRouteWithAnnotations()
        {
            var service = new OsrmServiceImpl(new Mock<ILogger<OsrmServiceImpl>>().Object);
            
            var coordinates = ImmutableList.Create(ImmutableList.Create(3.4991057, 44.5180226),
                ImmutableList.Create(3.57802065202088, 44.31901305));
            var result = await service.RouteRequest(coordinates,annotations:"true");
            Console.WriteLine(result.ToString());
        }

        [Test]
        public async Task ShouldGetRouteWithFullOverview()
        {
            var service = new OsrmServiceImpl(new Mock<ILogger<OsrmServiceImpl>>().Object);
            
            var coordinates = ImmutableList.Create(ImmutableList.Create(3.4991057, 44.5180226),
                ImmutableList.Create(3.57802065202088, 44.31901305));
            var result = await service.RouteRequest(coordinates,overview:"full");
            Console.WriteLine(result.ToString());
            Assert.IsNotNull(result.Routes[0].Geometry);
        }

        [Test]
        public async Task ShouldGetRouteWithNoOverview()
        {
            var service = new OsrmServiceImpl(new Mock<ILogger<OsrmServiceImpl>>().Object);
            
            var coordinates = ImmutableList.Create(ImmutableList.Create(3.4991057, 44.5180226),
                ImmutableList.Create(3.57802065202088, 44.31901305));
            var result = await service.RouteRequest(coordinates,overview:"false");
            Console.WriteLine(result.ToString());
            Assert.IsNull(result.Routes[0].Geometry);
        }

    }
}