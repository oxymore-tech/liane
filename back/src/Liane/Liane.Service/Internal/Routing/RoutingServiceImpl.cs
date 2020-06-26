using System;
using System.Collections.Immutable;
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

        public async Task<ImmutableList<Route>> GetAlternatives(LatLng start, LatLng end)
        {
            var coordinates = ImmutableList.Create(start, end);
            var routeResponse = await osrmService.Route(coordinates, "true", overview: "full");

            return routeResponse.Routes.Select(r => new Route(r.Geometry.Coordinates, r.Duration, r.Distance))
                .ToImmutableList();
        }

        public async Task<(Geojson geojson, float duration, float distance, float delta)> WaypointRouteMethod(LatLng startPoint, LatLng endPoint, LatLng wayPoint, float duration = -1)
        {
            if (duration < 0)
            {
                // Calculate the fastest route without necessarily passing by the waypoint
                var fastestRouteResponse =
                    await osrmService.Route(ImmutableList.Create(startPoint, endPoint), overview: "full");
                duration = fastestRouteResponse.Routes[0].Duration;
            }

            var coordinates = ImmutableList.Create(startPoint, wayPoint, endPoint);
            var routeResponse = await osrmService.Route(coordinates, overview: "full");

            var geojson = routeResponse.Routes[0].Geometry;
            var newDuration = routeResponse.Routes[0].Duration;
            var newDistance = routeResponse.Routes[0].Distance;
            var delta = Math.Abs(newDuration - duration);
            return (geojson, newDuration, newDistance, delta);
        }

        // ROUTE excluding POINT
        // param: startPoint, endPoint, wayPoint(, duration, distance) ; return: geojson LineString, newDuration, newDistance, delta
        public async Task<(Geojson geojson, float duration, float distance, float delta)> DetourRouteMethod(
            LatLng startPoint, LatLng endPoint, LatLng detourPoint,
            float duration = -1, float distance = -1, Geojson? geojson = null)
        {
            if (duration < 0 || distance < 0 || geojson == null)
            {
                // Calculate the fastest route to compare
                var fastestRouteResponse =
                    await osrmService.Route(ImmutableList.Create(startPoint, endPoint), overview: "full");
                geojson = fastestRouteResponse.Routes[0].Geometry;
                duration = fastestRouteResponse.Routes[0].Duration;
                distance = fastestRouteResponse.Routes[0].Distance;
            }

            var coordinates = ImmutableList.Create(startPoint, detourPoint, endPoint);
            var routeResponse = await osrmService.Route(coordinates, steps: "true", overview: "full");

            var newGeojson = routeResponse.Routes[0].Geometry;
            var newDuration = routeResponse.Routes[0].Duration;
            var newDistance = routeResponse.Routes[0].Distance;
            // Assumption made : if with the same startPoint and same endPoint, two routes return the same value for duration and distance, then the routes are equals.

            // If the two routes don't share the same distance and duration, there are not equal : then the fastest route doesn't cross the excluded point
            if (Math.Abs(duration - newDuration) > 0 && Math.Abs(distance - newDistance) > 0)
            {
                // Then the fastest route not passing by the detourPoint is simply the fastestRoute and delta = 0
                return (geojson, duration, distance, 0);
            }

            // Else find the steps where the route cross the detourPoint 
            var startIntersections = routeResponse.Routes[0].Legs[0].Steps[-1].Intersections;
            var endIntersections = routeResponse.Routes[0].Legs[1].Steps[0].Intersections;

            // Normally startIntersection[1].Location == endIntersection[0].Location == detourPoint
            Console.Write(startIntersections[1].Location.Lat + "==" + endIntersections[0].Location.Lat);

            // TODO: Then find alternatives routes between startIntersection[0].Location endIntersection[1].Location
            // Here need to check the entry values before sending an alternative request
            // If the entry values not corresponding then go find an other step ( start: Steps[i-1], end: Steps[i+1] )


            // looking for an exits to not cross the detourPoint
            var search = true;
            var stepsId = routeResponse.Routes[0].Legs[0].Steps.Count;
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
                else
                {
                    stepsId -= 1;
                    if (stepsId < 0)
                    {
                        // No solution
                        return (geojson, duration, distance, -1);
                    }

                    startIntersections = routeResponse.Routes[0].Legs[0].Steps[stepsId].Intersections;
                }
            } while (search);

            // Looking for an entry after the detourPoint
            stepsId = 0;
            var maxStepsId = routeResponse.Routes[0].Legs[1].Steps.Count;
            search = true;
            do
            {
                var nbOfEntries = 0;
                foreach (var anEntry in endIntersections[0].Entry)
                {
                    if (anEntry.Equals("false"))
                    {
                        nbOfEntries += 1;
                    }
                }

                if (nbOfEntries > 1)
                {
                    search = false;
                }
                else
                {
                    stepsId += 1;
                    if (stepsId > maxStepsId)
                    {
                        // No solution
                        return (geojson, duration, distance, -1);
                    }

                    endIntersections = routeResponse.Routes[0].Legs[1].Steps[stepsId].Intersections;
                }
            } while (search);

            // TODO: Then generate the final route which is not crossing detourPoint

            return (newGeojson, newDuration, newDistance, 0);
        }
    }
}