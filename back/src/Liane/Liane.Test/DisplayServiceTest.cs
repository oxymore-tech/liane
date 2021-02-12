using System.Collections.Immutable;
using System.Threading.Tasks;
using DeepEqual.Syntax;
using Liane.Api.Display;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Service.Internal.Display;
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

        [SetUp]
        public void SetUp()
        {
            var tripService = new Mock<ITripService>();
            tripService.Setup(s => s.List())
                .ReturnsAsync(Trips.AllTrips.ToImmutableHashSet);

            var redisSettings = new RedisSettings("localhost");
            displayService = new DisplayServiceImpl(new TestLogger<DisplayServiceImpl>(), new RedisClient(new TestLogger<RedisClient>(), redisSettings), tripService.Object);
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
            actual.WithDeepEqual(ImmutableList.Create(new LabeledPosition("Blajoux_Parking", Positions.Blajoux_Parking, 187.3471)))
                .WithFloatingPointTolerance()
                .IgnoreProperty<LabeledPosition>(l => l.Distance)
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
                .IgnoreProperty<LabeledPosition>(l => l.Distance)
                .Assert();
        }

        [Test]
        [Category("Integration")]
        public async Task ListTripsFromBlajouxParking()
        {
            await SetUpRedisAsync();
            var actual = await displayService!.ListTripsFrom(LabeledPositions.Blajoux_Parking);
            var expected = Trips.AllTrips.Remove(Trips.Mende_Florac);
            actual.WithDeepEqual(expected)
                .Assert();
        }

        [Test]
        [Category("Integration")]
        public async Task ListTripsFromLesBondons()
        {
            await SetUpRedisAsync();
            var actual = await displayService!.ListTripsFrom(LabeledPositions.LesBondons_Parking);
            var expected = Trips.AllTrips.Remove(Trips.Blajoux_Mende).Remove(Trips.Blajoux_Florac);
            actual.WithDeepEqual(expected)
                .Assert();
        }

        [Test]
        [Category("Integration")]
        public async Task ListDestinationsFromTrips()
        {
            await SetUpRedisAsync();
            var actual = await displayService!.ListDestinationsFrom(Trips.AllTrips);
            var expected = ImmutableHashSet.Create(LabeledPositions.Florac, LabeledPositions.Mende);
            actual.WithDeepEqual(expected)
                .IgnoreProperty<LabeledPosition>(l => l.Distance)
                .Assert();
        }

        private static async Task SetUpRedisAsync()
        {
            var redis = await ConnectionMultiplexer.ConnectAsync("localhost");
            var redisKey = new RedisKey("rallying points");
            var database = redis.GetDatabase();
            await database.KeyDeleteAsync(redisKey);
            foreach (var labeledPosition in LabeledPositions.RallyingPoints)
            {
                await database.GeoAddAsync(redisKey, labeledPosition.Position.Lng, labeledPosition.Position.Lat, new RedisValue(labeledPosition.Label));
            }
        }
    }
}