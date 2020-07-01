using System;
using System.Collections.Immutable;
using System.Drawing.Printing;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Service.Internal.Osrm;
using Route = Liane.Api.Routing.Route;

namespace Liane.Service.Internal.Routing
{
    public sealed class RoutingServiceImpl : IRoutingService
    {
        private readonly IOsrmService osrmService;

        public RoutingServiceImpl(IOsrmService osrmService)
        {
            this.osrmService = osrmService;
        }

        public async Task<Route> BasicRouteMethod(RoutingQuery query)
        {
            var coordinates = ImmutableList.Create(query.Start, query.End);
            var routeResponse = await osrmService.Route(coordinates, overview: "full");

            var geojson = routeResponse.Routes[0].Geometry;
            var duration = routeResponse.Routes[0].Duration;
            var distance = routeResponse.Routes[0].Distance;
            return new Route(geojson.Coordinates, duration, distance);
        }

        public async Task<ImmutableList<Route>> GetAlternatives(RoutingQuery query)
        {
            var coordinates = ImmutableList.Create(query.Start, query.End);
            var routeResponse = await osrmService.Route(coordinates, "true", overview: "full");

            return routeResponse.Routes.Select(r => new Route(r.Geometry.Coordinates, r.Duration, r.Distance))
                .ToImmutableList();
        }

        public async Task<DeltaRoute> CrossAWayPoint(RoutingWithPointQuery query)
        {
            var wayPoint = query.Point;
            float duration;
            if (query.Duration <= 0)
            {
                // Calculate the fastest route without necessarily passing by the waypoint
                var fastestRouteResponse =
                    await osrmService.Route(ImmutableList.Create(query.Start, query.End), overview: "full");
                duration = fastestRouteResponse.Routes[0].Duration;
                
            }
            else
            {
                duration = query.Duration;
            }

            var coordinates = ImmutableList.Create(query.Start, wayPoint, query.End);
            var routeResponse = await osrmService.Route(coordinates, overview: "full");

            coordinates = routeResponse.Routes[0].Geometry.Coordinates;
            var newDuration = routeResponse.Routes[0].Duration;
            var newDistance = routeResponse.Routes[0].Distance;
            var delta = duration - newDuration;
            Console.Write($" duration = {duration}, newDuration = {newDuration}, delta = {delta} ");
            return new DeltaRoute(coordinates, newDuration, newDistance, Math.Abs(delta));
        }

        // ROUTE excluding POINT
        // param: startPoint, endPoint, wayPoint(, duration, distance) ; return: geojson LineString, newDuration, newDistance, delta
        public async Task<DeltaRoute> MakeADetour(RoutingWithPointQuery query)
        {
            var detourPoint = query.Point;
            var duration = query.Duration;
            var distance = query.Distance;
            Geojson geojson = new Geojson("LineString",query.Coordinates);
            
            if (duration <= 0 || distance <= 0 )
            {
                // Calculate the fastest route to compare
                var fastestRouteResponse =
                    await osrmService.Route(ImmutableList.Create(query.Start,query.End), overview: "full");
                geojson = fastestRouteResponse.Routes[0].Geometry;
                duration = fastestRouteResponse.Routes[0].Duration;
                distance = fastestRouteResponse.Routes[0].Distance;
            }

            var coordinates = ImmutableList.Create(query.Start, detourPoint, query.End);
            var routeResponse = await osrmService.Route(coordinates, steps: "true", overview: "full");
            Console.Write($"nb Leg: {routeResponse.Routes[0].Legs.Count}");
            var newGeojson = routeResponse.Routes[0].Geometry;
            var newDuration = routeResponse.Routes[0].Duration;
            var newDistance = routeResponse.Routes[0].Distance;
            // Assumption made : if with the same startPoint and same endPoint, two routes return the same value for duration and distance, then the routes are equals.

            // If the two routes don't share the same distance and duration, there are not equal : then the fastest route doesn't cross the excluded point
            if (Math.Abs(duration - newDuration) > 0 && Math.Abs(distance - newDistance) > 0)
            {
                
                // Then the fastest route not passing by the detourPoint is simply the fastestRoute and delta = 0
                return new DeltaRoute( ImmutableList<LatLng>.Empty , duration, distance, -1 );
            }

            // Else find the steps where the route cross the detourPoint 
            var l = routeResponse.Routes[0].Legs[0].Steps.Count;// at least > 2
            var startIntersections = routeResponse.Routes[0].Legs[0].Steps[ l -2].Intersections;
            var endIntersections = routeResponse.Routes[0].Legs[1].Steps[1].Intersections;

            // Normally routeResponse.Routes[0].Legs[0].Steps[ l-1].Location == routeResponse.Routes[0].Legs[1].Steps[0].Location == detourPoint
            Console.Write(startIntersections[0] + ", " + endIntersections[0] +"\n");

            // Then find alternatives routes between startIntersection[0].Location endIntersection[1].Location
            // Here need to check the entry values before sending an alternative request
            // If the entry values not corresponding then go find an other step ( start: Steps[i-1], end: Steps[i+1] )


            // looking for an exits to not cross the detourPoint
            var search = true;
            var stepsId = routeResponse.Routes[0].Legs[0].Steps.Count-2;
            
            do
            {
                var nbOfExits = 0;
                foreach (var anEntry in startIntersections[0].Entry)
                {
                    if (anEntry.Equals("true"))
                    {
                        nbOfExits += 1;
                    }
                }

                if (nbOfExits > 1)
                {
                    
                    search = false;
                }
                //else
                //{
                    stepsId -= 1;
                    if (stepsId < 0)
                    {
                        // No solution
                        return new DeltaRoute(ImmutableList<LatLng>.Empty, duration, distance, -2);
                    }

                    startIntersections = routeResponse.Routes[0].Legs[0].Steps[stepsId].Intersections;
                //}
                Console.WriteLine($"Search: stepsId = {stepsId}, start = {startIntersections[0].Location}");
            } while (search);

            // Looking for an entry after the detourPoint
            stepsId = 1;
            var maxStepsId = routeResponse.Routes[0].Legs[1].Steps.Count;
            search = true;
            do
            {
                var nbOfEntries = 0;
                foreach (var anEntry in endIntersections[0].Entry)
                {
                    if (anEntry.Equals("true"))
                    {
                        nbOfEntries += 1;
                    }
                }

                if (nbOfEntries > 1)
                {
                    search = false;
                }
                //else
                //{
                    stepsId += 1;
                    if (stepsId > maxStepsId)
                    {
                        // No solution
                        return new DeltaRoute(geojson.Coordinates, duration, distance, -3);
                    }

                    endIntersections = routeResponse.Routes[0].Legs[1].Steps[stepsId].Intersections;
                    Console.WriteLine($"Search: stepsId = {stepsId}, end = {endIntersections[0].Location}");
                //}
            } while (search);

            // Then generate the final route which is not crossing detourPoint
            Console.Write($"start: {startIntersections[0].Location}, end: {endIntersections[0].Location}\n");
            var alternatives = await GetAlternatives(new RoutingQuery(startIntersections[0].Location.ToLatLng(),endIntersections[0].Location.ToLatLng()));

            if (alternatives.Count >1)
            {
                Console.Write($" nb alts:{alternatives.Count}, coord start:{alternatives[0].Coordinates}\n");
                var alternativePath = alternatives[1];
                // TODO: Get the coordinates before and after the deviation
                // final coordinates = ( path between start and startInstersections, alternative path, path between endIntersections and end)
                return new DeltaRoute(alternativePath.Coordinates, newDuration, newDistance, Math.Abs(alternatives[0].Duration - alternativePath.Duration) );
            }
            else
            {
                // No solution
                return new DeltaRoute(ImmutableList<LatLng>.Empty, duration, distance, -4);
            }
            
        }
    }
}