using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Http;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

public class RawTripServiceImpl : IRawTripService
{
    private const int Radius = 25_000;
        
    private readonly ICurrentContext currentContext;
    private readonly ILogger<RawTripServiceImpl> logger;
    private readonly IMongoDatabase mongo;

    public RawTripServiceImpl(ICurrentContext currentContext, MongoSettings settings, ILogger<RawTripServiceImpl> logger)
    {
        this.currentContext = currentContext;
        this.logger = logger;
        mongo = settings.GetDatabase();
    }

    public async Task Save(ImmutableList<RawTrip> trips)
    {
        if (!trips.IsEmpty)
        {
            var currentUser = currentContext.CurrentUser();
                
            logger.LogInformation("{Count} raw trip(s) saved for user '{currentUser}'", trips.Count, currentUser);
                
            await mongo.GetCollection<UserRawTrip>().InsertManyAsync(
                trips.Select(t => new UserRawTrip(ObjectId.GenerateNewId(), currentUser.Phone, t.Locations.ToList()))
            );
        }
    }

    public async Task<ImmutableList<RawTrip>> List()
    {
        var currentUser = currentContext.CurrentUser();
        var asyncCursor = await mongo.GetCollection<UserRawTrip>().FindAsync(t => t.UserId == currentUser.Phone);
            
        return asyncCursor.ToEnumerable()
            .Select(u => new RawTrip(u.Locations.ToImmutableList(), null))
            .ToImmutableList();
    }

    public async Task<ImmutableList<RawTrip>> ListFor(string userId)
    {
        var asyncCursor = await mongo.GetCollection<UserRawTrip>().FindAsync(t => t.UserId == userId);
            
        return asyncCursor.ToEnumerable()
            .Select(u => new RawTrip(u.Locations.ToImmutableList(), userId))
            .ToImmutableList();
    }

    public async Task<ImmutableList<RawTrip>> ListAll()
    {
        var asyncCursor = await mongo.GetCollection<UserRawTrip>().FindAsync(_ => true);

        return asyncCursor.ToEnumerable()
            .Select(u => new RawTrip(u.Locations.ToImmutableList(), u.UserId))
            .ToImmutableList();
    }

    public async Task<ImmutableList<RawTrip>> Snap(RawTripFilter rawTripFilter)
    {
        // TODO : find a better way to do such a request, this is **bad** and WILL lead to problems.
        // The reason for this implementation is that the objects of an array field cannot be
        // accessed in the filter, the ideal solution would be to get the first location and compute its distance
        // but such seems impossible because of the reasons explained above.
        // At the moment, this is fine as that request isn't meant to be used very frequently and because
        // raw trips are meant to be deleted. If it isn't the case anymore, this should be fixed.
        var asyncCursor = await mongo.GetCollection<UserRawTrip>().FindAsync(_ => true);

        // Other filter information are not used yet as the front-end is already filtering
        // on those field.
        // if (rawTripFilter.User is not null)
        // {
        //     
        // }
            
        return asyncCursor.ToEnumerable()
            .Where(t => rawTripFilter.Center.CalculateDistance(new LatLng(t.Locations.First().Latitude, t.Locations.First().Longitude)) <= Radius)
            .Select(u => new RawTrip(u.Locations.ToImmutableList(), u.UserId))
            .ToImmutableList();
    }

    public async Task<RawTripStats> Stats()
    {
        return new RawTripStats(await mongo.GetCollection<UserRawTrip>().CountDocumentsAsync(_ => true));
    }

}