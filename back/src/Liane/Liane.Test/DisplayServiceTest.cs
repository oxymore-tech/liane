using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Display;
using Liane.Api.Routing;
using Liane.Service.Internal.Display;
using Liane.Test.Util;
using NUnit.Framework;

namespace Liane.Test
{
    [TestFixture]
    public sealed class DisplayServiceTest
    {
        private readonly IDisplayService displayService = new DisplayServiceImpl(new TestLogger<DisplayServiceImpl>(), new RedisSettings("localhost"));

        [Test]
        public async Task DisplayTripsShouldBeNotNull()
        {
            var trips = await displayService.DisplayTrips(new DisplayQuery(new LatLng(0.0, 0.0)));
            Assert.IsNotNull(trips);
        }

        [Test]
        public async Task DisplayTripsCouldBeEmpty()
        {
            var trips = await displayService.DisplayTrips(new DisplayQuery(new LatLng(0.0, 0.0)));
            CollectionAssert.IsEmpty(trips);
        }

        [Test]
        [Category("Integration")]
        public async Task ShouldNotSnapPositionFromATooFarPosition()
        {
            var labeledPosition = await displayService.SnapPosition(Fixtures.Montbrun_Mairie);
            CollectionAssert.IsEmpty(labeledPosition);
        }

        [Test]
        [Category("Integration")]
        public async Task GuessStartFromARandomPosition()
        {
            var labeledPosition = await displayService.SnapPosition(Fixtures.Blajoux_Pelardon);
            CollectionAssert.AreEqual(ImmutableList.Create(new LabeledPosition("Blajoux-Parking", Fixtures.Blajoux_Parking, 187.3471)), labeledPosition);
        }

        [Test]
        public async Task DisplayTripsDestinationsFromARandomPosition()
        {
            var trips = await displayService.DisplayTrips(new DisplayQuery(new LatLng(0.0, 0.0)));
            CollectionAssert.IsEmpty(trips);
        }
    }
}