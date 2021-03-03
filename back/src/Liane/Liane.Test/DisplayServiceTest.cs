using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using DeepEqual.Syntax;
using Liane.Api.Display;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Service.Internal.Display;
using Liane.Service.Internal.Notification;
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
        private NotificationServiceImpl? notificationService;

        [SetUp]
        public void SetUp()
        {
            var osrmServiceDisplay = new OsrmServiceImpl(new Mock<Microsoft.Extensions.Logging.ILogger<OsrmServiceImpl>>().Object, new OsrmSettings(new Uri("http://liane.gjini.co:5000")));
            var tripService = new Mock<ITripService>();
            tripService.Setup(s => s.List())
                .ReturnsAsync(Trips.AllTrips.ToImmutableHashSet);
            var redisSettings = new RedisSettings("localhost");
            var notificationServiceDisplay = new NotificationServiceImpl(new RedisClient(new TestLogger<RedisClient>(), redisSettings));
            displayService = new DisplayServiceImpl(new TestLogger<DisplayServiceImpl>(), new RedisClient(new TestLogger<RedisClient>(), redisSettings), tripService.Object, osrmServiceDisplay, notificationServiceDisplay);
            osrmService = osrmServiceDisplay;
            notificationService = notificationServiceDisplay;
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
        public async Task DecomposeRouteBetweenMendeAndFlorac()
        {
            await SetUpRedisAsync();
            var actual = await displayService!.DecomposeTrip(LabeledPositions.Mende, LabeledPositions.Florac);
            var expected = ImmutableList.Create(Trips.Mende_Florac_1, Trips.Mende_Florac_2);
            actual.WithDeepEqual(expected).Assert();
        }
        public async Task EdgeKeys()
        {
            ConnectionMultiplexer redis = await ConnectionMultiplexer.ConnectAsync("localhost");
            var endPoints = redis.GetEndPoints();
            Console.WriteLine($"\n \n ENDPOINTS : {endPoints.Count()}");
            IServer server = redis.GetServer(endPoints[0]);
            var actual = displayService!.EdgeKeys(server);
            Console.WriteLine($"\n \n ACTUAL : {Print.ImmutableListToString(actual)}");
            var expected = ImmutableHashSet.Create(new RedisKey("Blajoux_Parking|Montbrun_En_Bas|Monday|8"), 
                                                new RedisKey("Blajoux_Parking|Montbrun_En_Bas|Tuesday|8"),
                                                new RedisKey("Blajoux_Parking|Montbrun_En_Bas|Wednesday|8"), 
                                                new RedisKey("Montbrun_En_Bas|La_Malene_Parking|Wednesday|9"),
                                                new RedisKey("La_Malene_Parking|Severac_dAveyron_Rond_Point|Wednesday|10"),
                                                new RedisKey("LesBondons_Parking|Prades|Monday|8"), 
                                                new RedisKey("LesBondons_Parking|Prades|Tuesday|8"), 
                                                new RedisKey("LesBondons_Parking|Prades|Thursday|8"), 
                                                new RedisKey("Prades|La_Malene_Parking|Wednesday|9"), 
                                                new RedisKey("Rouffiac_Boulangerie|SaintEnimie_Parking|Monday|8"), 
                                                new RedisKey("Rouffiac_Boulangerie|SaintEnimie_Parking|Tuesday|8"), 
                                                new RedisKey("Rouffiac_Boulangerie|SaintEnimie_Parking|Friday|8"), 
                                                new RedisKey("SaintEnimie_Parking|Mende|Monday|10"),
                                                new RedisKey("SaintEnimie_Parking|Mende|Tuesday|10"),
                                                new RedisKey("Rodez_Mac_Drive|Lanuejols_Parking_Eglise|Saturday|8"));
            actual.WithDeepEqual(expected)
                .Assert();
        }

        [Test]
        [Category("Integration")]
        public async Task FilterBySaturday()
        {
            var redis = await ConnectionMultiplexer.ConnectAsync("localhost");
            var endPoints = redis.GetEndPoints();
            IServer server = redis.GetServer(endPoints[0]);
            var edgeKeys = displayService!.EdgeKeys(server);
            var actual = displayService!.FilterByDay(edgeKeys, "Saturday");
            var expected = ImmutableList.Create(new RedisKey("Rodez_Mac_Drive|Lanuejols_Parking_Eglise|Saturday|8")); // 
            actual.WithDeepEqual(expected)
                .Assert();
        }

        [Test]
        [Category("Integration")]
        public async Task FilterByMonday()
        {
            var redis = await ConnectionMultiplexer.ConnectAsync("localhost");
            var endPoints = redis.GetEndPoints();
            IServer server = redis.GetServer(endPoints[0]);
            var edgeKeys = displayService!.EdgeKeys(server);
            var actual = displayService!.FilterByDay(edgeKeys, "Monday");
            var expected = ImmutableHashSet.Create(new RedisKey("Blajoux_Parking|Montbrun_En_Bas|Monday|8"),
                                                   new RedisKey("LesBondons_Parking|Prades|Monday|8"),
                                                   new RedisKey("Rouffiac_Boulangerie|SaintEnimie_Parking|Monday|8"),
                                                   new RedisKey("SaintEnimie_Parking|Mende|Monday|10"));
            actual.WithDeepEqual(expected)
                .Assert();
        }

        [Test]
        [Category("Integration")]
        public async Task FilterByStartHour()
        {
            var redis = await ConnectionMultiplexer.ConnectAsync("localhost");
            var endPoints = redis.GetEndPoints();
            IServer server = redis.GetServer(endPoints[0]);
            var edgeKeys = displayService!.EdgeKeys(server);
            var actual = displayService!.FilterByStartHour(edgeKeys, 9);
            var expected = ImmutableHashSet.Create(new RedisKey("Montbrun_En_Bas|La_Malene_Parking|Wednesday|9"),
                                                   new RedisKey("La_Malene_Parking|Severac_dAveyron_Rond_Point|Wednesday|10"),
                                                   new RedisKey("Prades|La_Malene_Parking|Wednesday|9"),
                                                   new RedisKey("SaintEnimie_Parking|Mende|Monday|10"), 
                                                   new RedisKey("SaintEnimie_Parking|Mende|Tuesday|10"));
            actual.WithDeepEqual(expected)
                .Assert();
        }

        [Test]
        [Category("Integration")]
        public async Task FilterByEndHour()
        {
            var redis = await ConnectionMultiplexer.ConnectAsync("localhost");
            var endPoints = redis.GetEndPoints();
            IServer server = redis.GetServer(endPoints[0]);
            var edgeKeys = displayService!.EdgeKeys(server);
            var actual = displayService!.FilterByEndHour(edgeKeys, 8);
            var expected = ImmutableHashSet.Create(new RedisKey("Blajoux_Parking|Montbrun_En_Bas|Monday|8"),
                                                   new RedisKey("Blajoux_Parking|Montbrun_En_Bas|Tuesday|8"),
                                                   new RedisKey("Blajoux_Parking|Montbrun_En_Bas|Wednesday|8"),
                                                   new RedisKey("LesBondons_Parking|Prades|Monday|8"),
                                                   new RedisKey("LesBondons_Parking|Prades|Tuesday|8"),
                                                   new RedisKey("LesBondons_Parking|Prades|Thursday|8"),
                                                   new RedisKey("Rouffiac_Boulangerie|SaintEnimie_Parking|Monday|8"),
                                                   new RedisKey("Rouffiac_Boulangerie|SaintEnimie_Parking|Tuesday|8"),
                                                   new RedisKey("Rouffiac_Boulangerie|SaintEnimie_Parking|Friday|8"),
                                                   new RedisKey("Rodez_Mac_Drive|Lanuejols_Parking_Eglise|Saturday|8"));
            actual.WithDeepEqual(expected)
                .Assert();
        }

        [Test]
        [Category("Integration")]
        public async Task FilterByStartPoint()
        {
            var redis = await ConnectionMultiplexer.ConnectAsync("localhost");
            var endPoints = redis.GetEndPoints();
            IServer server = redis.GetServer(endPoints[0]);
            var edgeKeys = displayService!.EdgeKeys(server);
            var actual = displayService!.FilterByStartPoint(edgeKeys, LabeledPositions.Rouffiac_Boulangerie.Id);
            var expected = ImmutableHashSet.Create(new RedisKey("Rouffiac_Boulangerie|SaintEnimie_Parking|Monday|8"),
                                                   new RedisKey("Rouffiac_Boulangerie|SaintEnimie_Parking|Tuesday|8"),
                                                   new RedisKey("Rouffiac_Boulangerie|SaintEnimie_Parking|Friday|8"));
            actual.WithDeepEqual(expected)
                .Assert();
        }

        [Test]
        [Category("Integration")]
        public async Task FilterByEndPoint()
        {
            var redis = await ConnectionMultiplexer.ConnectAsync("localhost");
            var endPoints = redis.GetEndPoints();
            IServer server = redis.GetServer(endPoints[0]);
            var edgeKeys = displayService!.EdgeKeys(server);
            var actual = displayService!.FilterByEndPoint(edgeKeys, LabeledPositions.La_Malene_Parking.Id);
            var expected = ImmutableHashSet.Create(new RedisKey("Montbrun_En_Bas|La_Malene_Parking|Wednesday|9"),
                                                   new RedisKey("Prades|La_Malene_Parking|Wednesday|9"));
            actual.WithDeepEqual(expected)
                .Assert();
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

        [Test]
        [Category("Integration")]
        public async Task SearchTripFromFloracToLesBondons()
        {
            await SetUpRedisAsync();
            var actual = await displayService!.SearchTrip(LabeledPositions.Florac, LabeledPositions.LesBondons_Parking, "Monday", 8);
            var expected = ImmutableList.Create(Trips.Florac_LesBondons);
            actual.WithDeepEqual(expected)
                .Assert();
            actual.WithDeepEqual(expected).Assert();
        }

        [Test]
        [Category("Integration")]
        public async Task ListRoutesFromBlajoux()
        {   
            await SetUpRedisAsync();
            var redis = await ConnectionMultiplexer.ConnectAsync("localhost");
            var endPoints = redis.GetEndPoints();
            IServer server = redis.GetServer(endPoints[0]);
            var trips = await displayService!.ListTripsFrom(LabeledPositions.Blajoux_Parking);
            var stringTrips = Print.ImmutableHashSetToString(trips);
            var actual = await displayService!.ListRoutesEdgesFrom(trips, "Wednesday");
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