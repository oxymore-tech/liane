using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Liane.Api.Grouping;
using Liane.Api.RallyingPoints;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Http;
using Liane.Service.Internal.RallyingPoints;
using Liane.Service.Internal.Trip;
using Liane.Service.Internal.Util;
using MongoDB.Driver;

namespace Liane.Service.Internal.Grouping;

public class IntentsMatchingServiceImpl : IIntentsMatchingService
{
    private readonly object groupsLock = new object();
    private static IEnumerable<List<ProcessedTripIntent>> IntentGroups { get; set; } = new List<List<ProcessedTripIntent>>();

    private IMongoDatabase? mongo;
    private ICurrentContext currentContext;

    public IntentsMatchingServiceImpl(MongoSettings? settings, ICurrentContext currentContext)
    {
        this.currentContext = currentContext;
        if (settings is not null) // For tests
        {
            mongo = settings.GetDatabase();
        }
    }

    public async Task UpdateTripGroups()
    {
        // Get every trip intents (with the rallying points it passes by)
        var tripsToPoints = (await mongo!.GetCollection<DbTripIntent>().FindAsync(e => true)).ToList();

        lock (groupsLock)
        { 
            IntentGroups = Group(tripsToPoints);
        }
    }

    public Task<List<MatchedTripIntent>> GetMatchedGroups()
    {
        var myGroups = new List<MatchedTripIntent>();
        var user = currentContext.CurrentUser().Phone;

        foreach (var group in IntentGroups)
        {
            var members = new List<string>();
            TripIntent? tripIntent = null;
            RallyingPoint? p1 = null;
            RallyingPoint? p2 = null;

            var foundGroup = false;
            foreach (var intent in group)
            {
                if (intent.TripIntent.User == user)
                {
                    tripIntent = TripIntentServiceImpl.ToTripIntent(intent.TripIntent);
                    p1 = RallyingPointServiceImpl.ToRallyingPoint(intent.P1);
                    p2 = RallyingPointServiceImpl.ToRallyingPoint(intent.P2);
                    foundGroup = true;
                }
                members.Add(intent.TripIntent.Id.ToString()!);
            }

            if (foundGroup)
            { 
                myGroups.Add(new MatchedTripIntent(tripIntent!, p1!, p2!, members));
            }
        }

        return Task.FromResult(myGroups);
    }
    
    public IEnumerable<List<ProcessedTripIntent>> Group(List<DbTripIntent> tripsToPoints)
    {
        // Select all possible pair of points for each trip
        var tripsTo2Points = new List<ProcessedTripIntent>();
        foreach (var tripToPoint in tripsToPoints)
        {
            var wayPoints = tripToPoint.Segments.Keys;
            var tripWith2Points =
                from point1 in wayPoints
                from point2 in wayPoints
                where point1.Id != point2.Id
                select new ProcessedTripIntent(tripToPoint, point1, point2);

            tripsTo2Points.AddRange(tripWith2Points);
        }

        // Group the trips based on 2 points
        var groups =
            from tripTo2Points in tripsTo2Points
            group tripTo2Points by new { p1 = tripTo2Points.P1.Id, p2 = tripTo2Points.P2.Id }
            into tripGroup
            where tripGroup.ToList().Count > 1 // Do not match the trip with itself
            select tripGroup.ToList();

        // Group based on the flow direction of the trips
        var finalGroups = new List<List<ProcessedTripIntent>>();
        foreach (var g in groups)
        {
            var flow12 = new List<ProcessedTripIntent>(); // Where trip is p1 -> p2
            var flow21 = new List<ProcessedTripIntent>(); // Where trip is p2 -> p1

            var p1 = g[0].P1; // Supposedly "From"
            var p2 = g[0].P2; // Supposedly "To"

            foreach (var trip1 in g)
            {
                // Check split in 2 sub-group according to flow between trips in the group
                if (FlowsThisWay(trip1, p1, p2))
                {
                    flow12.Add(trip1);
                }
                else if (FlowsThisWay(trip1, p2, p1))
                {
                    flow21.Add(trip1 with { P1 = p2, P2 = p1 });
                }
            }

            // Do not create group if only one trip intent
            if (flow12.Count > 1)
            {
                finalGroups.Add(flow12.ToList());
            }

            if (flow21.Count > 1)
            {
                finalGroups.Add(flow21.ToList());
            }
        }

        // Remove duplicate groups by taking the group with the largest possible portion
        finalGroups = GetBestGroups(finalGroups).ToList();

        return finalGroups;
    }
    
    private static bool FlowsThisWay(ProcessedTripIntent trip, DbRallyingPoint from, DbRallyingPoint to)
    {
        for (var tmp = trip.TripIntent.Segments[from]; tmp != null!; tmp = trip.TripIntent.Segments[tmp])
        {
            if (tmp.Id == to.Id)
            {
                return true;
            }
        }

        return false;
    }

    private static IEnumerable<List<ProcessedTripIntent>> GetBestGroups(IEnumerable<List<ProcessedTripIntent>> matchGroups)
    {
        var bestGroups = new Dictionary<string, KeyValuePair<double, List<ProcessedTripIntent>>>();

        foreach (var matchGroup in matchGroups)
        {
            // Create group key
            var orderedMatchGroup = matchGroup.OrderBy(o => o.TripIntent.Id).ToList();
            var keyBuilder = new StringBuilder();
            orderedMatchGroup.ForEach(t => keyBuilder.Append(t.TripIntent.Id));
            var key = keyBuilder.ToString();

            // Calculate distance
            var p1 = matchGroup.First().P1.Location.Coordinates;
            var coordinates1 = new LatLng(p1.Latitude, p1.Longitude);
            
            var p2 = matchGroup.First().P2.Location.Coordinates;
            var coordinates2 = new LatLng(p2.Latitude, p2.Longitude);
            
            var dist = coordinates1.CalculateDistance(coordinates2);

            // Get current max
            if (bestGroups.TryGetValue(key, out var value))
            {
                if (dist > value.Key) // dist > max
                {
                    bestGroups[key] = new KeyValuePair<double, List<ProcessedTripIntent>>(dist, matchGroup);
                }
            }
            else
            {
                bestGroups.Add(key, new KeyValuePair<double, List<ProcessedTripIntent>>(dist, matchGroup));
            }
        }

        return bestGroups.Select(c => c.Value.Value);
    }
}