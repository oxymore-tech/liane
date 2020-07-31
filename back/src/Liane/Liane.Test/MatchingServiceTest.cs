using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
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

        private readonly UserServiceImpl userServiceImpl;

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

            SetupRouteMock(mock,
                ImmutableList.Create(Fixtures.Mende, Fixtures.GorgesDuTarnCausses, Fixtures.Prades, Fixtures.Florac),
                "mende-gorgesDuTarnCausses-prades-florac.json");

            SetupRouteMock(mock,
                ImmutableList.Create(Fixtures.Mende, Fixtures.LeCrouzet, Fixtures.Cocures, Fixtures.Florac),
                "mende-leCrouzet-cocures-florac.json");

            SetupRouteMock(mock,
                ImmutableList.Create(Fixtures.Mende, Fixtures.LeCrouzet, Fixtures.Rampon, Fixtures.Florac),
                "mende-leCrouzet-rampon-florac.json");

            userServiceImpl = new UserServiceImpl();
            tested = new MatchingServiceImpl(mock.Object, userServiceImpl);
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
        public void ShouldMatchNoDriver()
        {
            tested.SearchDrivers("");
        }

        [Test]
        public async Task ShouldMatchNoPassenger()
        {
            userServiceImpl.EmptyUsersList();
            userServiceImpl.AddUser("Conducteur", Users.Driver);
            userServiceImpl.AddUser("Passager gorgesDuTarnCausses, trop long détour", UsersSameEnd.TooFarAwayStart);

            var passengers = await tested.SearchPassengers("Conducteur");
            CollectionAssert.IsEmpty(passengers);
        }

        [Test]
        public async Task ShouldMatchOnePassengerWithSameEnd()
        {
            userServiceImpl.EmptyUsersList();
            userServiceImpl.AddUser("Conducteur", Users.Driver);
            userServiceImpl.AddUser("Passager gorgesDuTarnCausses, trop long détour", UsersSameEnd.TooFarAwayStart);
            userServiceImpl.AddUser("Passager leCrouzet, à l'heure", UsersSameEnd.Matching);
            userServiceImpl.AddUser("Passager leCrouzet, en retard", UsersSameEnd.TooLateArrival);

            var passengers = await tested.SearchPassengers("Conducteur");
            Assert.AreEqual(1, passengers.Count);
            Assert.AreEqual("Passager leCrouzet, à l'heure", passengers[0].PassengerId);
        }

        [Test]
        public async Task ShouldMatchOnePassengerWithAnotherEnd()
        {
            userServiceImpl.EmptyUsersList();
            userServiceImpl.AddUser("Conducteur", Users.Driver);
            userServiceImpl.AddUser("Passager gorgesDuTarnCausses récup' trop loin", UsersAnotherEnd.TooFarAwayStart);
            userServiceImpl.AddUser("Passager leCrouzet à l'heure, déposé en cours de route", UsersAnotherEnd.Matching);
            userServiceImpl.AddUser("Passager leCrouzet en retard, déposable en cours de route", UsersAnotherEnd.TooLateArrival);
            userServiceImpl.AddUser("Passager leCrouzet à l'heure mais détour globalement trop long", UsersAnotherEnd.TooLongDetour);

            var passengers = await tested.SearchPassengers("Conducteur");
            Assert.AreEqual(1, passengers.Count);
            Assert.AreEqual("Passager leCrouzet à l'heure, déposé en cours de route", passengers[0].PassengerId);
        }


        [Test]
        public async Task ShouldMatchOnePassengerWithSameEndAndAlreadyHas0nePassenger()
        {
        }

        [Test]
        public async Task ShouldMatchOnePassengerWithSameEndAndAlreadyHasMultiplePassengers()
        {
        }


        [Test]
        public async Task ShouldMatchOnePassengerWithAnotherEndAndAlreadyHas0nePassenger()
        {
            // userServiceImpl.EmptyDriversList();
            // userServiceImpl.AddUser("Conducteur avec 1 passager", Users.Driver);
            // var passengers = await tested.SearchPassengers("Conducteur avec 1 passager");
        }

        [Test]
        public async Task ShouldMatchOnePassengerWithAnotherEndAndAlreadyHasMultiplePassengers()
        {
            // userServiceImpl.EmptyDriversList();
            // userServiceImpl.AddUser("Conducteur avec 2+ passagers", Users.Driver);
            // var passengers = await tested.SearchPassengers("Conducteur avec 2+ passagers");
        }
    }
}