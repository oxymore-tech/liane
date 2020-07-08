using System.Collections.Immutable;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Util.Http;
using Microsoft.Extensions.Logging;

namespace Liane.Service.Internal.Osrm
{
    public sealed class OsrmServiceImpl : IOsrmService
    {
        private readonly HttpClient client;
        private readonly ILogger<OsrmServiceImpl> logger;

        public OsrmServiceImpl(ILogger<OsrmServiceImpl> logger)
        {
            client = new HttpClient();
            this.logger = logger;
        }

        /// <summary>
        /// /route/v1/driving/{coordinates}?alternatives={true|false|number}&amp;steps={true|false}&amp;geometries={polyline|polyline6|geojson}&amp;overview={full|simplified|false}&amp;annotations={true|false}
        /// </summary>
        /// <param name="coordinates"></param>
        /// <param name="alternatives"></param>
        /// <param name="steps"></param>
        /// <param name="geometries"></param>
        /// <param name="overview"></param>
        /// <param name="annotations"></param>
        /// <param name="continueStraight"></param>
        /// <returns></returns>
        public async Task<Response.Routing> Route(ImmutableList<LatLng> coordinates,
            string alternatives = "false",
            string steps = "false",
            string geometries = "geojson",
            string overview = "simplified",
            string annotations = "false",
            string continueStraight = "default")
        {
            string uri = $"http://liane.gjini.co:5000/route/v1/driving/{Format(coordinates)}";

            logger.LogInformation("Call returns ", uri);

            var result = await client.GetAsyncAs<Response.Routing>(uri, new
            {
                alternatives,
                steps,
                geometries,
                overview,
                annotations,
                continue_straight = continueStraight
            });
            logger.LogInformation("Call returns ", result);
            return result;
        }

        private static string Format(ImmutableList<LatLng> coordinates)
        {
            return string.Join(";", coordinates.Select(c => c.ToLngLatString()));
        }

        // NEAREST
        // /nearest/v1/{profile}/{coordinates}.json?number={number}

        // MATCH
        // /match/v1/{profile}/{coordinates}?steps={true|false}&geometries={polyline|polyline6|geojson}&overview={simplified|full|false}&annotations={true|false}

        // TABLE
        // /table/v1/{profile}/{coordinates}?{sources}=[{elem}...];&{destinations}=[{elem}...]&annotations={duration|distance|duration,distance}

        // TRIP
        // /trip/v1/{profile}/{coordinates}?roundtrip={true|false}&source{any|first}&destination{any|last}&steps={true|false}&geometries={polyline|polyline6|geojson}&overview={simplified|full|false}&annotations={true|false}
    }
}