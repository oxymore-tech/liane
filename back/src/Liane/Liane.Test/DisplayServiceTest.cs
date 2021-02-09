using System.Threading.Tasks;
using Liane.Api;
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
            var trips = await displayService.DisplayTrips();
            Assert.IsNotNull(trips);
        }

        [Test]
        public async Task DisplayTripsCouldBeEmpty()
        {
            var trips = await displayService.DisplayTrips();
            CollectionAssert.IsEmpty(trips);
        }        

    }
}