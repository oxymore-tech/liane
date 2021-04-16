using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using DeepEqual.Syntax;
using Liane.Api.Display;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Service.Internal.Display;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Util;
using Liane.Test.Util;
using Microsoft.Extensions.Logging;
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
            var osrmServiceDisplay = new OsrmServiceImpl(new Mock<ILogger<OsrmServiceImpl>>().Object, new OsrmSettings(new Uri("http://liane.gjini.co:5000")));
            var tripService = new Mock<ITripService>();
            tripService.Setup(s => s.List())
                .ReturnsAsync(Trips.AllTrips.ToImmutableHashSet);
            var redisSettings = new RedisSettings("localhost");
            this.displayService = new DisplayServiceImpl(new TestLogger<DisplayServiceImpl>(), new RedisClient(new TestLogger<RedisClient>(), redisSettings), tripService.Object, osrmServiceDisplay);
            osrmService = osrmServiceDisplay;
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
        public async Task SearchTripBlajouxParking()
        {
            await SetUpRedisAsync();
            var actual = await displayService!.SearchTrips(new SearchQuery(Start: LabeledPositions.Blajoux_Parking));
            var expected = ImmutableHashSet.Create(Trips.Blajoux_Mende, Trips.Blajoux_Florac);
            actual.WithDeepEqual(expected)
                .Assert();
        }

        [Test]
        [Category("Integration")]
        public async Task SearchTripLesBondons()
        {
            await SetUpRedisAsync();
            var actual = await displayService!.SearchTrips(new SearchQuery(Start: LabeledPositions.LesBondons_Parking));
            var expected = ImmutableHashSet.Create(new Trip(ImmutableList.Create(LabeledPositions.LesBondons_Parking, LabeledPositions.Florac)));
            actual.WithDeepEqual(expected)
                .Assert();
        }

        [Test]
        [Category("Integration")]
        public async Task SearchTripMende()
        {
            await SetUpRedisAsync();
            var actual = await displayService!.SearchTrips(new SearchQuery(Start: LabeledPositions.Mende));
            var expected = ImmutableHashSet.Create(Trips.Mende_Florac);
            actual.WithDeepEqual(expected)
                .Assert();
        }

        [Test]
        [Category("Integration")]
        public async Task ListEtapesFromMende()
        {
            await SetUpRedisAsync();
            var trips = await displayService!.SearchTrips(new SearchQuery(Start: LabeledPositions.Mende));
            var actual = displayService!.ListStepsFrom(trips);
            var expected = ImmutableList.Create(LabeledPositions.LesBondons_Parking, LabeledPositions.Florac);
            actual.WithDeepEqual(expected)
                .IgnoreProperty<RallyingPoint>(l => l.Distance)
                .Assert();
        }

        [Test]
        [Category("Integration")]
        public async Task SearchTripFromFloracToLesBondons()
        {
            await SetUpRedisAsync();
            var actual = await displayService!.SearchTrips(DayOfWeek.Monday, LabeledPositions.Florac, LabeledPositions.LesBondons_Parking, 8, 9);
            var expected = ImmutableList.Create(Trips.Florac_LesBondons);
            actual.WithDeepEqual(expected)
                .Assert();
            actual.WithDeepEqual(expected).Assert();
        }

        [Test]
        [Category("Integration")]
        public async Task SearchTripFromNull()
        {
            await SetUpRedisAsync();
            var actual = await displayService!.SearchTrips(DayOfWeek.Monday, LabeledPositions.Florac, LabeledPositions.LeCrouzet);
            var expected = ImmutableHashSet.Create(Trips.Florac_Cocures, Trips.Cocures_Le_Crouzet);
            actual.WithDeepEqual(expected)
                .Assert();
            actual.WithDeepEqual(expected).Assert();
        }

        [Test]
        [Category("Integration")]
        public async Task ListRoutesFromBlajoux()
        {
            await SetUpRedisAsync();
            var trips = await displayService!.SearchTrips(new SearchQuery(Start: LabeledPositions.Blajoux_Parking));
            var actual = await displayService!.ListRoutesEdgesFrom(trips, DayOfWeek.Wednesday);
            var expected = new Dictionary<string, RouteStat>();
            var preExpected1 = await osrmService!.Route(Positions.Blajoux_Parking, Positions.Montbrun_En_Bas);
            var expected1 = new RouteStat(preExpected1.Routes[0].Geometry.Coordinates.ToLatLng(), 3);
            var preExpected2 = await osrmService!.Route(Positions.Montbrun_En_Bas, Positions.Mende);
            var expected2 = new RouteStat(preExpected2.Routes[0].Geometry.Coordinates.ToLatLng(), 1);
            var preExpected3 = await osrmService!.Route(Positions.Montbrun_En_Bas, Positions.Florac);
            var expected3 = new RouteStat(preExpected3.Routes[0].Geometry.Coordinates.ToLatLng(), 1);
            expected.Add("Blajoux_Parking|Montbrun_En_Bas", expected1);
            expected.Add("Montbrun_En_Bas|Mende", expected2);
            expected.Add("Montbrun_En_Bas|Florac", expected3);
            actual.WithDeepEqual(expected)
                .Assert();
        }

        private static async Task SetUpRedisAsync()
        {
            var redis = await ConnectionMultiplexer.ConnectAsync("localhost");
            var database = redis.GetDatabase();
            await database.KeyDeleteAsync(RedisKeys.RallyingPoint());
            foreach (var (id, (lat, lng), _) in LabeledPositions.RallyingPoints)
            {
                await database.GeoAddAsync(RedisKeys.RallyingPoint(), lng, lat, new RedisValue(id));
            }
        }
    }
}