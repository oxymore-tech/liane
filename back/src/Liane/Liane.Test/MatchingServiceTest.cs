using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Matching;
using Liane.Api.Util;
using Liane.Service.Internal.Matching;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Osrm.Response;
using Liane.Test.Util;
using Moq;
using NUnit.Framework;

// ReSharper disable All

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
            mock.Setup(service =>
                    service.Route(ImmutableList.Create(Fixtures.Mende, Fixtures.Florac),
                        "false",
                        "false",
                        "geojson",
                        "simplified",
                        "false",
                        "default"
                    )
                )
                .ReturnsAsync(() => AssertJson.ReadJson<Routing>("mende-florac.json"));

            mock.Setup(service =>
                    service.Route(ImmutableList.Create(Fixtures.Mende, Fixtures.LeCrouzet, Fixtures.Florac),
                        "false",
                        "false",
                        "geojson",
                        "simplified",
                        "false",
                        "default"
                    ))
                .ReturnsAsync(() => AssertJson.ReadJson<Routing>("mende-leCrouzet-florac.json"));

            mock.Setup(service =>
                    service.Route(ImmutableList.Create(Fixtures.Mende, Fixtures.GorgesDuTarnCausses, Fixtures.Florac),
                        "false",
                        "false",
                        "geojson",
                        "simplified",
                        "false",
                        "default"))
                .ReturnsAsync(() => AssertJson.ReadJson<Routing>("mende-gorgesDuTarnCausses-florac.json"));

            tested = new MatchingServiceImpl(mock.Object, new UserServiceImpl());
            driver = new Driver(Fixtures.Mende, Fixtures.Florac, 500);
            passengerA = new Passenger(Fixtures.GorgesDuTarnCausses);
            passengerB = new Passenger(Fixtures.LeCrouzet);
        }

        [Test]
        public async Task ShouldMatchNoPassenger()
        {
            tested.UserService.EmptyUsersList();
            tested.UserService.AddUser("Conducteur", driver);
            tested.UserService.AddUser("Passager gorgesDuTarnCausses", passengerA);

            var passengers = await tested.SearchPassengers("Conducteur");
            CollectionAssert.IsEmpty(passengers);
        }


        [Test]
        public async Task ShouldMatchOnePassengerWithSameDestination()
        {
            tested.UserService.EmptyUsersList();
            tested.UserService.AddUser("Conducteur", driver);
            tested.UserService.AddUser("Passager leCrouzet", passengerB);

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