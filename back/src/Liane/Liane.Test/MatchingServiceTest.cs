using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Matching;
using Liane.Api.Routing;
using Liane.Service.Internal.Matching;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Osrm.Response;
using Liane.Test.Util;
using Moq;
using NUnit.Framework;

namespace Liane.Test
{
    [TestFixture]
    public sealed class MatchingServiceTest
    {
        private readonly MatchingServiceImpl tested;
        private readonly Driver driver;
        private readonly Passenger passengerA;
        private readonly Passenger passengerB;

        public MatchingServiceTest()
        {
            var mock = new Mock<IOsrmService>();

            SetupRouteMock(mock,
                ImmutableList.Create(Fixtures.Mende, Fixtures.Florac),
                "mende-florac.json");

            SetupRouteMock(mock,
                ImmutableList.Create(Fixtures.Mende, Fixtures.LeCrouzet, Fixtures.Florac),
                "mende-leCrouzet-florac.json");

            SetupRouteMock(mock,
                ImmutableList.Create(Fixtures.Mende, Fixtures.GorgesDuTarnCausses, Fixtures.Florac),
                "mende-gorgesDuTarnCausses-florac.json");

            tested = new MatchingServiceImpl(mock.Object, new UserServiceImpl());
            driver = new Driver(Fixtures.Mende, Fixtures.Florac, 500);
            passengerA = new Passenger(Fixtures.GorgesDuTarnCausses);
            passengerB = new Passenger(Fixtures.LeCrouzet);
        }

        private static void SetupRouteMock(Mock<IOsrmService> mock, ImmutableList<LatLng> input, string file)
        {
            mock.Setup(service =>
                    service.Route(
                        It.Is<ImmutableList<LatLng>>(l => input.SequenceEqual(l)),
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<string>()))
                .ReturnsAsync(() => AssertJson.ReadJson<Routing>(file));
        }

        [Test]
        public async Task ShouldMatchNoPassenger()
        {
            tested.userService.EmptyUsersList();
            tested.userService.AddUser("Conducteur", driver);
            tested.userService.AddUser("Passager gorgesDuTarnCausses", passengerA);

            var passengers = await tested.SearchPassengers("Conducteur");
            CollectionAssert.IsEmpty(passengers);
        }

        [Test]
        public async Task ShouldMatchOnePassengerWithSameDestination()
        {
            tested.userService.EmptyUsersList();
            tested.userService.AddUser("Conducteur", driver);
            tested.userService.AddUser("Passager leCrouzet", passengerB);

            var passengers = await tested.SearchPassengers("Conducteur");
            CollectionAssert.IsNotEmpty(passengers);
        }

        [Test]
        public void ShouldMatchNoDriver()
        {
            tested.SearchDrivers("");
        }
    }
}