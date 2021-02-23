using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using DeepEqual.Syntax;
using Liane.Api.Display;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Service.Internal.Display;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Util;
using Liane.Test.Util;
using Moq;
using NUnit.Framework;
using StackExchange.Redis;

namespace Liane.Test
{
    [TestFixture]
    public sealed class DisplayServiceTest
    {
        private IDisplayService? displayService;
        private OsrmServiceImpl? osrmService;

        [SetUp]
        public void SetUp()
        {
            var osrmServiceDisplay = new OsrmServiceImpl(new Mock<Microsoft.Extensions.Logging.ILogger<OsrmServiceImpl>>().Object, new OsrmSettings(new Uri("http://liane.gjini.co:5000")));
            var tripService = new Mock<ITripService>();
            tripService.Setup(s => s.List())
                .ReturnsAsync(Trips.AllTrips.ToImmutableHashSet);

            var redisSettings = new RedisSettings("localhost");
            displayService = new DisplayServiceImpl(new TestLogger<DisplayServiceImpl>(), new RedisClient(new TestLogger<RedisClient>(), redisSettings), tripService.Object, osrmServiceDisplay);
            osrmService = osrmServiceDisplay;
        }

        [Test]
        public async Task DisplayTripsShouldBeNotNull()
        {
            var trips = await displayService!.DisplayTrips(new DisplayQuery(new LatLng(0.0, 0.0)));
            Assert.IsNotNull(trips);
        }

        [Test]
        public async Task DisplayTripsCouldBeEmpty()
        {
            var trips = await displayService!.DisplayTrips(new DisplayQuery(new LatLng(0.0, 0.0)));
            CollectionAssert.IsEmpty(trips);
        }

        [Test]
        [Category("Integration")]
        public async Task ShouldNotSnapPositionFromATooFarPosition()
        {
            var labeledPosition = await displayService!.SnapPosition(new LatLng(44.402029649783, 3.8582611083984));
            CollectionAssert.IsEmpty(labeledPosition);
        }

        [Test]
        [Category("Integration")]
        public async Task GuessStartFromARandomPosition()
        {
            await SetUpRedisAsync();
            var actual = await displayService!.SnapPosition(Positions.Blajoux_Pelardon);
            actual.WithDeepEqual(ImmutableList.Create(new RallyingPoint("Blajoux_Parking", Positions.Blajoux_Parking, 187.3471)))
                .WithFloatingPointTolerance()
                .IgnoreProperty<RallyingPoint>(l => l.Distance)
                .Assert();
        }

        [Test]
        [Category("Integration")]
        public async Task ListDestinationsFromAStart()
        {
            await SetUpRedisAsync();
            var actual = await displayService!.ListDestinationsFrom(LabeledPositions.Blajoux_Parking);
            var expected = LabeledPositions.RallyingPoints.Remove(LabeledPositions.Blajoux_Parking);
            actual.WithDeepEqual(expected)
                .IgnoreProperty<RallyingPoint>(l => l.Distance)
                .Assert();
        }

        [Test]
        [Category("Integration")]
        public async Task ListTripsFromBlajouxParking()
        {
            await SetUpRedisAsync();
            var actual = await displayService!.ListTripsFrom(LabeledPositions.Blajoux_Parking);
            var expected = ImmutableHashSet.Create(Trips.Blajoux_Mende, Trips.Blajoux_Florac);
            actual.WithDeepEqual(expected)
                .Assert();
        }

        [Test]
        [Category("Integration")]
        public async Task ListTripsFromLesBondons()
        {
            await SetUpRedisAsync();
            var actual = await displayService!.ListTripsFrom(LabeledPositions.LesBondons_Parking);
            var expected = ImmutableHashSet.Create(new Trip(ImmutableList.Create(LabeledPositions.LesBondons_Parking, LabeledPositions.Florac)));
            actual.WithDeepEqual(expected)
                .Assert();
        }

        [Test]
        [Category("Integration")]
        public async Task ListTripsFromMende()
        {
            await SetUpRedisAsync();
            var actual = await displayService!.ListTripsFrom(LabeledPositions.Mende);
            var expected = ImmutableHashSet.Create(Trips.Mende_Florac);
            actual.WithDeepEqual(expected)
                .Assert();
        }

        [Test]
        [Category("Integration")]
        public async Task ListRoutesFromMende()
        {
            await SetUpRedisAsync();
            var trips = await displayService!.ListTripsFrom(LabeledPositions.Mende);
            var stringTrips = Print.ImmutableHashSetToString(trips);
            var actual = await displayService!.ListRoutesEdgesFrom(trips);
            var stringDict = Print.DictToString(actual);
            Console.WriteLine($"\n \n acutal : {stringDict}");
            var expected = new Dictionary<string, ImmutableList<LatLng>>();
            var preExpected1 = await osrmService!.Route(Positions.Mende, Positions.LesBondons_Parking);
            var expected1 = preExpected1.Routes[0].Geometry;
            var preExpected2 = await osrmService!.Route(Positions.LesBondons_Parking, Positions.Florac);
            var expected2 = preExpected2.Routes[0].Geometry;
            expected.Add("Mende_LesBondons_Parking", expected1.Coordinates.ToLatLng());
            expected.Add("LesBondons_Parking_Florac", expected2.Coordinates.ToLatLng());
            actual.WithDeepEqual(expected)
                .Assert();
        }

        [Test]
        [Category("Integration")]
        public async Task EdgeKeys()
        {
            await SetUpRedisAsync();
            ConnectionMultiplexer redis = ConnectionMultiplexer.Connect("localhost");
            IServer server = redis.GetServer("localhost", 8081);
            var actual = displayService!.EdgeKeys(server);
            var expected = ImmutableList.Create("FRANCOIS CHUT");
            actual.WithDeepEqual(expected);
        }

        [Test]
        [Category("Integration")]
        public async Task FilterByDay()
        {
            await SetUpRedisAsync();
            ConnectionMultiplexer redis = ConnectionMultiplexer.Connect("localhost");
            IServer server = redis.GetServer("localhost", 8081);
            var edgeKeys = displayService!.EdgeKeys(server);
            var actual = displayService!.FilterByDay(edgeKeys, "samedi");
            var expected = ImmutableList.Create("KARIMOU");
            actual.WithDeepEqual(expected);
        }

        [Test]
        [Category("Integration")]
        public async Task ListEtapesFromMende()
        {
            await SetUpRedisAsync();
            var trips = await displayService!.ListTripsFrom(LabeledPositions.Mende);
            var actual = displayService!.ListStepsFrom(trips);
            var expected = ImmutableList.Create(LabeledPositions.LesBondons_Parking, LabeledPositions.Florac);
            actual.WithDeepEqual(expected)
                .IgnoreProperty<RallyingPoint>(l => l.Distance)
                .Assert();
        }

        private static async Task SetUpRedisAsync()
        {
            var redis = await ConnectionMultiplexer.ConnectAsync("localhost");
            var redisKey = new RedisKey("RallyingPoints");
            var database = redis.GetDatabase();
            await database.KeyDeleteAsync(redisKey);
            foreach (var labeledPosition in LabeledPositions.RallyingPoints)
            {
                await database.GeoAddAsync(redisKey, labeledPosition.Position.Lng, labeledPosition.Position.Lat, new RedisValue(labeledPosition.Id));
            }
        }
    }
}