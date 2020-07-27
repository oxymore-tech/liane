using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Service.Internal.Matching;
using Moq;
using NUnit.Framework;

namespace Liane.Test
{
    [TestFixture]
    public sealed class MatchingServiceTest
    {
        private readonly MatchingServiceImpl tested;

        public MatchingServiceTest()
        {
            var mock = new Mock<IRoutingService>();
            // mock.Setup(service => service.BasicRouteMethod(It.IsAny<RoutingQuery>()))
            //     .ReturnsAsync(() => new Route(ImmutableList<LngLat>.Empty, 3, 2));
            tested = new MatchingServiceImpl(mock.Object);
        }

        [Test]
        public async Task ShouldMatchNoPassenger()
        {
            var passengers = await tested.SearchPassengers("");
            CollectionAssert.IsEmpty(passengers);
        }

        

        [Test]
        public void ShouldMatchOnePassengerWithSameDestination()
        {
            tested.SearchPassengers("");
        }
        
        
        [Test]
        public void ShouldMatchNoDriver()
        {
            tested.SearchDrivers("");
        }
        
    }
}