using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Liane.Api.Grouping;
using Liane.Api.RallyingPoints;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Http;

namespace Liane.Service.Internal.Match;

public sealed class IntentMatchingServiceImpl : IIntentMatchingService
{
    private readonly ICurrentContext currentContext;
    private readonly IRoutingService routingService;
    private readonly ITripIntentService tripIntentService;

    public IntentMatchingServiceImpl(ICurrentContext currentContext, IRoutingService routingService, ITripIntentService tripIntentService)
    {
        this.currentContext = currentContext;
        this.routingService = routingService;
        this.tripIntentService = tripIntentService;
    }

    public async Task<ImmutableList<TripIntentMatch>> Matches()
    {
        var myGroups = new List<TripIntentMatch>();
        var user = currentContext.CurrentUser().Phone;
        var tripIntents = await tripIntentService.List();
        var intentGroups = await Group(tripIntents);

        foreach (var group in intentGroups)
        {
            var matches = new List<Match>();
            TripIntent? tripIntent = null;
            RallyingPoint? p1 = null;
            RallyingPoint? p2 = null;

            var foundGroup = false;
            foreach (var intent in group)
            {
                if (intent.TripIntent.CreatedBy == user)
                {
                    tripIntent = intent.TripIntent;
                    p1 = intent.P1;
                    p2 = intent.P2;
                    foundGroup = true;
                }

                matches.Add(new Match(intent.TripIntent.CreatedBy!, intent.P1, intent.P2));
            }

            if (foundGroup)
            {
                myGroups.Add(new TripIntentMatch(tripIntent!, p1!, p2!, matches.ToImmutableList()));
            }
        }

        return myGroups.ToImmutableList();
    }

    private async Task<ImmutableList<ImmutableList<ProcessedTripIntent>>> Group(ImmutableList<TripIntent> tripIntents)
    {
        // Select all possible pair of points for each trip
        var processedTripIntents = new List<ProcessedTripIntent>();
        foreach (var tripIntent in tripIntents)
        {
            var from = (RallyingPoint?)tripIntent.From;
            var to = (RallyingPoint?)tripIntent.To;

            if (from == null || to == null)
            {
                continue;
            }

            var wayPoints = await routingService.GetWayPoints(from, to);
            var cartesianProcessedTripIntents =
                from p1 in wayPoints
                from p2 in wayPoints
                where p1.Order < p2.Order
                select new ProcessedTripIntent(tripIntent, p1.RallyingPoint, p2.RallyingPoint);

            processedTripIntents.AddRange(cartesianProcessedTripIntents);
        }

        // Group the trips based on 2 points
        var groups =
            from tripTo2Points in processedTripIntents
            group tripTo2Points by new { p1 = tripTo2Points.P1.Id, p2 = tripTo2Points.P2.Id }
            into tripGroup
            where tripGroup.Count() > 1 // Do not match the trip with itself
            select tripGroup.ToImmutableList();

        // Remove duplicate groups by taking the group with the largest possible portion
        return GetBestGroups(groups.ToList()).ToImmutableList();
    }

    private static IEnumerable<ImmutableList<ProcessedTripIntent>> GetBestGroups(IEnumerable<ImmutableList<ProcessedTripIntent>> matchGroups)
    {
        var bestGroups = new Dictionary<string, KeyValuePair<double, ImmutableList<ProcessedTripIntent>>>();

        foreach (var matchGroup in matchGroups)
        {
            // Create group key
            var orderedMatchGroup = matchGroup.OrderBy(o => o.TripIntent.Id).ToList();
            var keyBuilder = new StringBuilder();
            orderedMatchGroup.ForEach(t => keyBuilder.Append(t.TripIntent.Id));
            var key = keyBuilder.ToString();

            // Calculate distance
            var p1 = matchGroup.First().P1.Location;
            var coordinates1 = new LatLng(p1.Lat, p1.Lng);

            var p2 = matchGroup.First().P2.Location;
            var coordinates2 = new LatLng(p2.Lat, p2.Lng);

            var dist = coordinates1.Distance(coordinates2);

            // Get current max
            if (bestGroups.TryGetValue(key, out var value))
            {
                if (dist > value.Key) // dist > max
                {
                    bestGroups[key] = new KeyValuePair<double, ImmutableList<ProcessedTripIntent>>(dist, matchGroup);
                }
            }
            else
            {
                bestGroups.Add(key, new KeyValuePair<double, ImmutableList<ProcessedTripIntent>>(dist, matchGroup));
            }
        }

        return bestGroups.Select(c => c.Value.Value);
    }
}