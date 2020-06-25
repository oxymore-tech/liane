using System;
using System.Collections.Immutable;
using System.Globalization;
using System.Net.Http;
using System.Threading.Tasks;
using Liane.Api;
using Liane.Api.Object;
using Liane.Api.Response;
using Liane.Api.Util.Http;
using Microsoft.Extensions.Logging;

namespace Liane.Service.Internal
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

        // OSRM SERVICES :

        // ROUTE
        // /route/v1/driving/{coordinates}?alternatives={true|false|number}&steps={true|false}&geometries={polyline|polyline6|geojson}&overview={full|simplified|false}&annotations={true|false}
        public async Task<Routing> RouteRequest(ImmutableList<ImmutableList<double>> coordinates,
            string alternatives = "false",
            string steps = "false", 
            string geometries = "geojson",
            string overview = "simplified",
            string annotations = "false",
            string continueStraight = "default")
        {
            
            string uri = "http://localhost:5000/route/v1/driving/";
            var n = coordinates.Count;
            for (var i = 0; i < n; i++)
            {
                uri += coordinates[i][0].ToString(CultureInfo.InvariantCulture) + "," + coordinates[i][1].ToString(CultureInfo.InvariantCulture);
                if (i != n - 1)
                    uri += ';';
                else
                    uri += '?';
            }
            
            uri += "alternatives=" + alternatives
                                   + "&steps=" + steps
                                   + "&geometries=" + geometries
                                   + "&overview=" + overview
                                   + "&annotations=" + annotations
                                   +"&continue_straight="+continueStraight;

            Console.Write(uri);

            var result = await client.GetAsyncAs<Routing>(uri);
            logger.LogInformation("Call returns ", result);
            return result;
        }
        
        // NEAREST
        // /nearest/v1/{profile}/{coordinates}.json?number={number}
        
        // MATCH
        // /match/v1/{profile}/{coordinates}?steps={true|false}&geometries={polyline|polyline6|geojson}&overview={simplified|full|false}&annotations={true|false}
        
        // TABLE
        // /table/v1/{profile}/{coordinates}?{sources}=[{elem}...];&{destinations}=[{elem}...]&annotations={duration|distance|duration,distance}
        
        // TRIP
        // /trip/v1/{profile}/{coordinates}?roundtrip={true|false}&source{any|first}&destination{any|last}&steps={true|false}&geometries={polyline|polyline6|geojson}&overview={simplified|full|false}&annotations={true|false}
        
        
        // LIANE CUSTOMIZED SERVICES :
        // BASIC ROUTE
        // param: startPoint, endPoint ; return: geojson LineString, duration, distance
        public async Task<(Geojson geojson, float duration, float distance)> BasicRouteMethod(ImmutableList<double> startPoint, ImmutableList<double> endPoint)
        {
            var coordinates = ImmutableList.Create(startPoint,endPoint);
            var routeResponse = await RouteRequest(coordinates,overview:"full");
            
            var geojson = routeResponse.Routes[0].Geometry;
            var duration = routeResponse.Routes[0].Duration;
            var distance = routeResponse.Routes[0].Distance;
            return (geojson, duration, distance);
        }
        
        // MULTIPLE ROUTE/ ALTERNATIVES
        // param: startPoint, endPoint ; return: list of (geojson LineString, duration, distance)
        public async Task<ImmutableList<Task<(Geojson geojson, float duration, float distance)>>> AlternativesRouteMethod(ImmutableList<double> startPoint, ImmutableList<double> endPoint)
        {
            var coordinates = ImmutableList.Create(startPoint,endPoint);
            var routeResponse = await RouteRequest(coordinates,"true",overview:"full");

            var alternatives = ImmutableList.Create<Task<(Geojson geojson, float duration, float distance)>>();
            
            var n = routeResponse.Routes.Length;
            for (int i = 0; i < n; i++)
            {
                var alternative = Task.FromResult((routeResponse.Routes[i].Geometry,routeResponse.Routes[i].Duration, routeResponse.Routes[i].Distance));
                alternatives.Add(alternative);
            }

            return alternatives;
        }
        
        // ROUTE with WAYPPOINT
        // param: startPoint, endPoint, wayPoint(, duration) ; return: geojson LineString, newDuration, newDistance, delta
        public async Task<(Geojson geojson, float duration, float distance, float delta)> WaypointRouteMethod(ImmutableList<double> startPoint, ImmutableList<double> endPoint, ImmutableList<double> wayPoint, float duration = -1)
        {
            if (duration < 0)
            {
                // Calculate the fastest route without necessarily passing by the waypoint
                var fastestRouteResponse = await RouteRequest(ImmutableList.Create(startPoint,endPoint),overview:"full");
                duration = fastestRouteResponse.Routes[0].Duration;
            }

            var coordinates = ImmutableList.Create(startPoint, wayPoint, endPoint);
            var routeResponse = await RouteRequest(coordinates, overview: "full");
            
            var geojson = routeResponse.Routes[0].Geometry;
            var newDuration = routeResponse.Routes[0].Duration;
            var newDistance = routeResponse.Routes[0].Distance;
            var delta = Math.Abs(newDuration - duration);
            return (geojson, newDuration, newDistance, delta);
        }

        // ROUTE excluding POINT
        // param: startPoint, endPoint, wayPoint(, duration, distance) ; return: geojson LineString, newDuration, newDistance, delta
        public async Task<(Geojson geojson, float duration, float distance, float delta)> DetourRouteMethod(ImmutableList<double> startPoint, ImmutableList<double> endPoint, ImmutableList<double> detourPoint, float duration = -1, float distance = -1, Geojson geojson = null )
        {
            
            if (duration < 0 || distance < 0 || geojson == null )
            {
                // Calculate the fastest route to compare
                var fastestRouteResponse = await RouteRequest(ImmutableList.Create(startPoint,endPoint),overview:"full");
                geojson = fastestRouteResponse.Routes[0].Geometry;
                duration = fastestRouteResponse.Routes[0].Duration;
                distance = fastestRouteResponse.Routes[0].Distance;
            }

            var coordinates = ImmutableList.Create(startPoint, detourPoint, endPoint);
            var routeResponse = await RouteRequest(coordinates, steps:"true", overview: "full");

            var newGeojson = routeResponse.Routes[0].Geometry;
            var newDuration = routeResponse.Routes[0].Duration;
            var newDistance = routeResponse.Routes[0].Distance;
            // Assumption made : if with the same startPoint and same endPoint, two routes return the same value for duration and distance, then the routes are equals.
            
            // If the two routes don't share the same distance and duration, there are not equal : then the fastest route doesn't cross the excluded point
            if ( Math.Abs(duration - newDuration) > 0 && Math.Abs(distance - newDistance) > 0)
            {
                // Then the fastest route not passing by the detourPoint is simply the fastestRoute and delta = 0
                return (geojson, duration, distance, 0);
            }
            
            // Else find the steps where the route cross the detourPoint 
            var startIntersections = routeResponse.Routes[0].Legs[0].Steps[-1].Intersections;
            var endIntersections = routeResponse.Routes[0].Legs[1].Steps[0].Intersections;
            
            // Normally startIntersection[1].Location == endIntersection[0].Location == detourPoint
            Console.Write( startIntersections[1].Location[0] +"=="+ endIntersections[0].Location[0] );
            
            // TODO: Then find alternatives routes between startIntersection[0].Location endIntersection[1].Location
            // Here need to check the entry values before sending an alternative request
            // If the entry values not corresponding then go find an other step ( start: Steps[i-1], end: Steps[i+1] )
            
            // TODO: Then generate the final route which is not crossing detourPoint
            
            return (newGeojson, newDuration, newDistance, 0);
        }
        
        
        
    }
}