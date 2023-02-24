using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using Dijkstra.NET.Graph.Simple;
using Dijkstra.NET.ShortestPath;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Moq;

namespace Liane.Test.Internal.Match;

public static class RoutingServiceMock
{
    public static IRoutingService Object()
    {
        var graph = new Graph();
        var aurillac = graph.AddNode();
        var saintpaul = graph.AddNode();
        var ytrac = graph.AddNode();
        var vic = graph.AddNode();
        var arpajon = graph.AddNode();
        var naucelles = graph.AddNode();
        var laroquebrou = graph.AddNode();
        var reilhac = graph.AddNode();
        var sansac = graph.AddNode();
        var saintsimon = graph.AddNode();
        var mauriac = graph.AddNode();
        var saintcernin = graph.AddNode();

        var indexes = new Dictionary<uint, RallyingPoint>
        {
            { aurillac, CantalPoints.Aurillac },
            { saintpaul, CantalPoints.Saintpaul },
            { ytrac, CantalPoints.Ytrac },
            { vic, CantalPoints.Vic },
            { arpajon, CantalPoints.Arpajon },
            { naucelles, CantalPoints.Naucelles },
            { laroquebrou, CantalPoints.Laroquebrou },
            { reilhac, CantalPoints.Reilhac },
            { sansac, CantalPoints.Sansac },
            { saintsimon, CantalPoints.Saintsimon },
            { mauriac, CantalPoints.Mauriac },
            { saintcernin, CantalPoints.Saintcernin }
        }.ToImmutableDictionary();
        var reverse = indexes.ToImmutableDictionary(e => e.Value, e => e.Key);

        AddRoadBetween(graph, laroquebrou, saintpaul);
        AddRoadBetween(graph, saintpaul, aurillac);
        AddRoadBetween(graph, mauriac, saintcernin);
        AddRoadBetween(graph, saintcernin, reilhac);
        AddRoadBetween(graph, reilhac, naucelles);
        AddRoadBetween(graph, naucelles, aurillac);
        AddRoadBetween(graph, saintsimon, aurillac);
        AddRoadBetween(graph, aurillac, sansac);
        AddRoadBetween(graph, aurillac, arpajon);
        AddRoadBetween(graph, arpajon, ytrac);
        AddRoadBetween(graph, arpajon, vic);

        var routingService = new Mock<IRoutingService>();
        routingService.Setup(s => s.GetWayPoints(It.IsAny<RallyingPoint>(), It.IsAny<RallyingPoint>()))
            .ReturnsAsync((RallyingPoint from, RallyingPoint to) =>
            {
                var p1 = reverse[from];
                var p2 = reverse[to];
                var r = graph.Dijkstra(p1, p2);
                return r.GetPath()
                    .Select((n, i) => new WayPoint(indexes[n], i, 0, 0))
                    .ToImmutableSortedSet();
            });

        return routingService.Object;
    }

    private static void AddRoadBetween(Graph graphModel, uint from, uint to)
    {
        graphModel.Connect(from, to, 1);
        graphModel.Connect(to, from, 1);
    }
}