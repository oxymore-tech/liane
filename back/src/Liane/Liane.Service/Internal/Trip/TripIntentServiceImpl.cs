using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Liane.Api.Grouping;
using Liane.Api.RallyingPoints;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Http;
using Liane.Service.Internal.RallyingPoints;
using Liane.Service.Internal.Util;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

public class TripIntentServiceImpl : ITripIntentService
{
    private readonly ICurrentContext currentContext;
    private readonly IMongoDatabase mongo;
    private readonly IRoutingService routingService;
    private readonly IRallyingPointService rallyingPointService;
    private readonly IIntentMatchingService intentMatchingService;

    public TripIntentServiceImpl(MongoSettings settings, ICurrentContext currentContext, IRoutingService routingService, IRallyingPointService rallyingPointService,
        IIntentMatchingService intentMatchingService)
    {
        this.currentContext = currentContext;
        this.routingService = routingService;
        this.rallyingPointService = rallyingPointService;
        this.intentMatchingService = intentMatchingService;
        mongo = settings.GetDatabase();
    }

    public async Task<TripIntent> Create(TripIntent tripIntent)
    {
        var id = ObjectId.GenerateNewId();
        var created = tripIntent with { Id = id.ToString() };
        var currentUser = currentContext.CurrentUser().Phone;

        await mongo.GetCollection<DbTripIntent>()
            .InsertOneAsync(new DbTripIntent(id, tripIntent.Title, currentUser, tripIntent.From, tripIntent.To, tripIntent.GoTime, tripIntent.ReturnTime));

        return created;
    }

    public async Task Delete(string id)
    {
        await mongo.GetCollection<DbTripIntent>().DeleteOneAsync(ti => ti.Id == ObjectId.Parse(id));
    }

    public async Task<ImmutableList<TripIntent>> List()
    {
        var filter = FilterDefinition<DbTripIntent>.Empty;

        var builder = Builders<DbTripIntent>.Filter;

        var currentUser = currentContext.CurrentUser();

        if (!currentUser.IsAdmin)
        {
            var regex = new Regex(Regex.Escape(currentUser.Phone), RegexOptions.None);
            filter &= builder.Regex(x => x.User, new BsonRegularExpression(regex));
        }

        var result = (await mongo.GetCollection<DbTripIntent>().FindAsync(filter))
            .ToEnumerable()
            .Select(ToTripIntent)
            .ToImmutableList();

        return result;
    }

    public static TripIntent ToTripIntent(DbTripIntent dbTripIntent)
    {
        return new TripIntent(dbTripIntent.Id.ToString(), dbTripIntent.User,
            RallyingPointServiceImpl.ToRallyingPoint(dbTripIntent.From), RallyingPointServiceImpl.ToRallyingPoint(dbTripIntent.To),
            dbTripIntent.FromTime, dbTripIntent.ToTime, null);
    }
}