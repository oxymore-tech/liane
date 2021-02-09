using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api;
using Liane.Api.Routing;
using Liane.Service.Internal;
using Liane.Service.Internal.Matching;
using Liane.Service.Internal.Osrm;
using Liane.Service.Internal.Osrm.Response;
using Liane.Test.Util;
using Moq;
using NUnit.Framework;

namespace Liane.Test
{
    [TestFixture]
    public sealed class DisplayServiceTest
    {
        private IDisplayService displayService = new DisplayServiceImpl();

        [Test]
        public async Task ShouldMatchNoDriverAsync()
        {
            var trips = await displayService.DisplayTrips();
        }    

    }
}