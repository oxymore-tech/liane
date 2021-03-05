using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using DeepEqual.Syntax;
using Liane.Api.Trip;
using Liane.Service.Internal.Display;
using Liane.Service.Internal.Util;
using Liane.Test.Util;
using Moq;
using NUnit.Framework;
using StackExchange.Redis;
using IRedis = Liane.Api.Util.IRedis;

namespace Liane.Test.Internal.Display
{
    [TestFixture]
    [Category("Integration")]
    public sealed class RedisFilterExtensionsTest
    {
        private IRedis? redis;

        [SetUp]
        public async Task SetUp()
        {
            var tripService = new Mock<ITripService>();
            tripService.Setup(s => s.List())
                .ReturnsAsync(Trips.AllTrips.ToImmutableHashSet);
            var redisSettings = new RedisSettings("localhost");
            redis = new RedisClient(new TestLogger<RedisClient>(), redisSettings);

            var database = await redis.Get();
            foreach (var command in AssertExtensions.ReadTestResource("redis-data.txt")
                .Split("\n"))
            {
                await database.ExecuteAsync(command);
            }
        }

        [Test]
        public async Task EdgeKeys()
        {
            var actual = await redis!.ListEdgeKeys();
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
            var edgeKeys = await redis!.ListEdgeKeys();
            var actual = edgeKeys.FilterByDay("Saturday");
            var expected = ImmutableList.Create(new RedisKey("Rodez_Mac_Drive|Lanuejols_Parking_Eglise|Saturday|8"));
            actual.WithDeepEqual(expected)
                .Assert();
        }

        [Test]
        [Category("Integration")]
        public async Task FilterByMonday()
        {
            var edgeKeys = await redis!.ListEdgeKeys();
            var actual = edgeKeys.FilterByDay("Monday");
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
            var edgeKeys = await redis!.ListEdgeKeys();
            var actual = edgeKeys.FilterByStartHour(9);
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
            var edgeKeys = await redis!.ListEdgeKeys();
            var actual = edgeKeys.FilterByEndHour(8);
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
            var edgeKeys = await redis!.ListEdgeKeys();
            var actual = edgeKeys.FilterByStartPoint(LabeledPositions.Rouffiac_Boulangerie.Id);
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
            var edgeKeys = await redis!.ListEdgeKeys();
            var actual = edgeKeys.FilterByEndPoint(LabeledPositions.La_Malene_Parking.Id);
            var expected = ImmutableHashSet.Create(new RedisKey("Montbrun_En_Bas|La_Malene_Parking|Wednesday|9"),
                new RedisKey("Prades|La_Malene_Parking|Wednesday|9"));
            actual.WithDeepEqual(expected)
                .Assert();
        }
        
        [Test]
        [Category("Integration")]
        public async Task FilterByAllDays()
        {
            var edgeKeys = await redis!.ListEdgeKeys();
            var actual = edgeKeys.FilterByDay();
            var expected = edgeKeys;
            actual.WithDeepEqual(expected)
                .Assert();
        }
    }
}