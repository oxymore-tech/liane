using System.Collections.Immutable;
using System.Threading.Tasks;
using DeepEqual.Syntax;
using Liane.Api;
using Liane.Api.Routing;
using Liane.Service.Internal;
using Liane.Service.Internal.Display;
using Liane.Service.Internal.Util;
using Liane.Test.Util;
using NUnit.Framework;
using StackExchange.Redis;

namespace Liane.Test
{
    [TestFixture]
    public sealed class RallyingPointServiceTest
    {
        private IRallyingPointService? rallyingPointService;

        [SetUp]
        public void SetUp()
        {
            var redisSettings = new RedisSettings("localhost");
            rallyingPointService = new RallyingPointServiceImpl(new RedisClient(new TestLogger<RedisClient>(), redisSettings));
        }

        [Test]
        [Category("Integration")]
        public async Task ShouldNotSnapPositionFromATooFarPosition()
        {
            var labeledPosition = await rallyingPointService!.TrySnap(new LatLng(44.402029649783, 3.8582611083984));
            Assert.IsNull(labeledPosition);
        }

        [Test]
        [Category("Integration")]
        public async Task GuessStartFromARandomPosition()
        {
            await SetUpRedisAsync();
            var actual = await rallyingPointService!.Snap(Positions.Blajoux_Pelardon);
            actual.WithDeepEqual(ImmutableList.Create(new RallyingPoint("Blajoux_Parking", Positions.Blajoux_Parking, "Blajoux Parking", 187.3471)))
                .WithFloatingPointTolerance()
                .IgnoreProperty<RallyingPoint>(l => l.Distance)
                .Assert();
        }

        [Test]
        [Category("Integration")]
        public async Task ListDestinationsFromAStart()
        {
            await SetUpRedisAsync();
            var actual = await rallyingPointService!.List(LabeledPositions.Blajoux_Parking.Position);
            var expected = LabeledPositions.RallyingPoints;
            actual.WithDeepEqual(expected)
                .IgnoreProperty<RallyingPoint>(l => l.Distance)
                .Assert();
        }

        private static async Task SetUpRedisAsync()
        {
            var redis = await ConnectionMultiplexer.ConnectAsync("localhost");
            var database = redis.GetDatabase();
            await database.KeyDeleteAsync(RedisKeys.RallyingPoint());
            foreach (var (id, (lat, lng), _, _) in LabeledPositions.RallyingPoints)
            {
                await database.GeoAddAsync(RedisKeys.RallyingPoint(), lng, lat, new RedisValue(id));
            }
        }
    }
}