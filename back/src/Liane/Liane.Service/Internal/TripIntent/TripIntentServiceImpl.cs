using System;
using System.Collections.Immutable;
using System.Globalization;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Liane.Api.RallyingPoint;
using Liane.Api.Routing;
using Liane.Api.TripIntent;
using Liane.Api.Util.Http;
using Liane.Service.Internal.RallyingPoint;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.TripIntent;

public class TripIntentServiceImpl : ITripIntentService
{
    private readonly ILogger<TripIntentServiceImpl> logger;
    private readonly ICurrentContext currentContext;
    private readonly IMongoCollection<DbTripIntent> tripIntentsCollection;

    public TripIntentServiceImpl(MongoSettings settings, ILogger<TripIntentServiceImpl> logger, ICurrentContext currentContext)
    {
        this.logger = logger;
        this.currentContext = currentContext;
        
        var mongo = new MongoClient(new MongoClientSettings
        {
            Server = new MongoServerAddress(settings.Host, 27017),
            Credential = MongoCredential.CreateCredential("admin", settings.Username, settings.Password)
        });

        var database = mongo.GetDatabase(MongoKeys.Database());
        tripIntentsCollection = database.GetCollection<DbTripIntent>(MongoKeys.TripIntent());
    }
    
    public async Task<Api.TripIntent.TripIntent> Create(ReceivedTripIntent tripIntent)
    {
        var ti = new Api.TripIntent.TripIntent(
            null,
            currentContext.CurrentUser(),
            tripIntent.From, 
            tripIntent.To,
            DateTime.Parse(tripIntent.FromTime, null, DateTimeStyles.RoundtripKind),
            tripIntent.ToTime is null ? null: DateTime.Parse(tripIntent.ToTime, null, DateTimeStyles.RoundtripKind)
        );
        
        var newId = ObjectId.GenerateNewId();
        var created = ti with { Id = newId.ToString() };

        await tripIntentsCollection.InsertOneAsync(ToDbTripIntent(created));
        return created;
    }

    public Task Delete(string id)
    {
        throw new NotImplementedException();
    }

    public async Task<ImmutableList<Api.TripIntent.TripIntent>> List()
    {
        var filter = FilterDefinition<DbTripIntent>.Empty;
        
        var result = (await tripIntentsCollection.FindAsync(filter))
            .ToEnumerable()
            .Select(ToTripIntent)
            .ToImmutableList();

        return result;
    }

    public async Task<ImmutableList<Api.TripIntent.TripIntent>> ListByUser()
    {
        var filter = FilterDefinition<DbTripIntent>.Empty;
        
        // Filter on user
        var builder = Builders<DbTripIntent>.Filter;
        var regex = new Regex( "\\" + currentContext.CurrentUser(), RegexOptions.None);
        filter &= builder.Regex(x => x.User , new BsonRegularExpression(regex));
        
        var result = (await tripIntentsCollection.FindAsync(filter))
            .ToEnumerable()
            .Select(ToTripIntent)
            .ToImmutableList();

        return result;
    }

    private static DbTripIntent ToDbTripIntent(Api.TripIntent.TripIntent tripIntent)
    {
        return new DbTripIntent(tripIntent.Id is null ? null : ObjectId.Parse(tripIntent.Id), tripIntent.User,
            RallyingPointServiceImpl.ToDbRallyingPoint(tripIntent.From), RallyingPointServiceImpl.ToDbRallyingPoint(tripIntent.To),
            tripIntent.FromTime, tripIntent.ToTime);
    }
    
    private static Api.TripIntent.TripIntent ToTripIntent(DbTripIntent dbTripIntent)
    {
        return new Api.TripIntent.TripIntent(dbTripIntent.Id.ToString(), dbTripIntent.User, ToRallyingPoint(dbTripIntent.From) , ToRallyingPoint(dbTripIntent.To),
        dbTripIntent.FromTime, dbTripIntent.ToTime);
    }

    private static RallyingPoint ToRallyingPoint(DbRallyingPoint rallyingPoint)
    {
        var loc = new LatLng(rallyingPoint.Location.Coordinates.Latitude, rallyingPoint.Location.Coordinates.Longitude);
        return new RallyingPoint(rallyingPoint.Id.ToString(), rallyingPoint.Label, loc, rallyingPoint.IsActive);
    }

}