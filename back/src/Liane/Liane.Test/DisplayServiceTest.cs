using System.Threading.Tasks;
using Liane.Api.Display;
using Liane.Api.Routing;
using Liane.Service.Internal;
using NUnit.Framework;

namespace Liane.Test
{
    [TestFixture]
    public sealed class DisplayServiceTest
    {
        private IDisplayService displayService = new DisplayServiceImpl();

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
        public async Task GuessStartFromARandomPosition()
        {
            var labeledPosition = await displayService.SnapPosition(new LatLng(44.3388629, 3.4831178));
            Assert.AreEqual(new LabeledPosition("Blajoux-Parking", new LatLng(44.33719040451529, 3.4833812113191227)), labeledPosition);
        }     

        [Test]
        public async Task DisplayTripsDestinationsFromARandomPosition()
        {
            var trips = await displayService.DisplayTrips(new DisplayQuery(new LatLng(0.0, 0.0)));
            CollectionAssert.IsEmpty(trips);
        }     
    }
}