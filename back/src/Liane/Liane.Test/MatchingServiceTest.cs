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
        private Driver driver;
        private Passenger tooFarAwayStart;
        private Passenger matching;
        private Passenger tooLateArrival;
        private Passenger tooLongDetour;

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
                ImmutableList.Create(Fixtures.Mende, Fixtures.GorgesDuTarnCausses, Fixtures.Florac),
                "mende-gorgesDuTarnCausses-prades-florac.json");
            
            SetupRouteMock(mock,
                ImmutableList.Create(Fixtures.Mende, Fixtures.LeCrouzet, Fixtures.Florac),
                "mende-leCrouzet-cocures-florac.json");
            
            SetupRouteMock(mock,
                ImmutableList.Create(Fixtures.Mende, Fixtures.LeCrouzet, Fixtures.Florac),
                "mende-leCrouzet-rampon-florac.json");
            
            SetupUsers();
            tested = new MatchingServiceImpl(mock.Object);
        }

        private void SetupUsers(bool sameEnd = true,bool noPassengerAlready = true)
        {
            
            driver = new Driver(Fixtures.Mende, Fixtures.Florac,1200);
            if(noPassengerAlready && !sameEnd)
            {
                tooFarAwayStart = new Passenger(Fixtures.GorgesDuTarnCausses,Fixtures.Prades,100000);
                matching = new Passenger(Fixtures.LeCrouzet,Fixtures.Cocures, 100000);
                tooLateArrival = new Passenger(Fixtures.LeCrouzet,Fixtures.Cocures, 3000);
                tooLongDetour = new Passenger(Fixtures.LeCrouzet,Fixtures.Rampon, 100000);
                return;
            }
            tooFarAwayStart = new Passenger(Fixtures.GorgesDuTarnCausses,Fixtures.Florac,100000);
            matching = new Passenger(Fixtures.LeCrouzet,Fixtures.Florac, 4000);
            tooLateArrival = new Passenger(Fixtures.LeCrouzet,Fixtures.Florac, 3000);
            tooLongDetour = new Passenger(Fixtures.LeCrouzet,Fixtures.Rampon);

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
            UserUtils.EmptyUsersList();
            UserUtils.AddUser("Conducteur", driver);
            UserUtils.AddUser("Passager gorgesDuTarnCausses, trop long détour", tooFarAwayStart);

            var passengers = await tested.SearchPassengers("Conducteur");
            CollectionAssert.IsEmpty(passengers);
        }

        [Test]
        public async Task ShouldMatchOnePassengerWithSameDestination()
        {
            SetupUsers();
            UserUtils.AddUser("Passager leCrouzet, à l'heure", matching);
            UserUtils.AddUser("Passager leCrouzet, en retard", tooLateArrival);
            
            var passengers = await tested.SearchPassengers("Conducteur");
            Assert.AreEqual(1, passengers.Count);
            Assert.AreEqual("Passager leCrouzet",passengers[0].PassengerId);
        }

        [Test]
        public async Task ShouldMatchOnePassengerWithAnotherDestination()
        {    
            UserUtils.EmptyPassengersList();
            SetupUsers(false);
            UserUtils.AddUser("Passager gorgesDuTarnCausses récup' trop loin", tooFarAwayStart);
            UserUtils.AddUser("Passager leCrouzet à l'heure, déposé en cours de route", matching);
            UserUtils.AddUser("Passager leCrouzet en retard, déposable en cours de route", tooLateArrival);
            UserUtils.AddUser("Passager leCrouzet à l'heure mais détour globalement trop long", tooLongDetour);
            
            var passengers = await tested.SearchPassengers("Conducteur");
            Assert.AreEqual(1, passengers.Count);
            Assert.AreEqual("Passager leCrouzet à l'heure, déposé en cours de route",passengers[0].PassengerId);
        }


        [Test]
        public async Task ShouldMatchOnePassengerWithSameDestinationAndAlreadyHas0nePassenger()
        {
            
        }
        [Test]
        public async Task ShouldMatchOnePassengerWithSameDestinationAndAlreadyHasMultiplePassengers()
        {
            
        }
        
        
        [Test]
        public async Task ShouldMatchOnePassengerWithAnotherDestinationAndAlreadyHas0nePassenger()
        {
            // UserUtils.EmptyDriversList();
            // UserUtils.AddUser("Conducteur avec 1 passager", driver);
            // var passengers = await tested.SearchPassengers("Conducteur avec 1 passager");
        }
        [Test]
        public async Task ShouldMatchOnePassengerWithAnotherDestinationAndAlreadyHasMultiplePassengers()
        {
            // UserUtils.EmptyDriversList();
            // UserUtils.AddUser("Conducteur avec 2+ passagers", driver);
            // var passengers = await tested.SearchPassengers("Conducteur avec 2+ passagers");
        }
    }
}