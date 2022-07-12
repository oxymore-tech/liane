using System;
using System.Collections.Immutable;
using System.Globalization;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
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

    public TripIntentServiceImpl(MongoSettings settings, ICurrentContext currentContext)
    {
        this.currentContext = currentContext;
        mongo = settings.GetDatabase();
    }

    public async Task<TripIntent> Create(ReceivedTripIntent tripIntent)
    {
        var ti = new TripIntent(
            null,
            currentContext.CurrentUser().Phone,
            tripIntent.From,
            tripIntent.To,
            DateTime.Parse(tripIntent.FromTime, null, DateTimeStyles.RoundtripKind),
            tripIntent.ToTime is null ? null : DateTime.Parse(tripIntent.ToTime, null, DateTimeStyles.RoundtripKind)
        );

        var newId = ObjectId.GenerateNewId();
        var created = ti with { Id = newId.ToString() };

        await mongo.GetCollection<DbTripIntent>().InsertOneAsync(ToDbTripIntent(created));
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

    private static DbTripIntent ToDbTripIntent(TripIntent tripIntent)
    {
        return new DbTripIntent(tripIntent.Id is null ? null : ObjectId.Parse(tripIntent.Id), tripIntent.User,
            RallyingPointServiceImpl.ToDbRallyingPoint(tripIntent.From), RallyingPointServiceImpl.ToDbRallyingPoint(tripIntent.To),
            tripIntent.FromTime, tripIntent.ToTime);
    }

    private static TripIntent ToTripIntent(DbTripIntent dbTripIntent)
    {
        return new TripIntent(dbTripIntent.Id.ToString(), dbTripIntent.User, ToRallyingPoint(dbTripIntent.From), ToRallyingPoint(dbTripIntent.To),
            dbTripIntent.FromTime, dbTripIntent.ToTime);
    }

    private static RallyingPoint ToRallyingPoint(DbRallyingPoint rallyingPoint)
    {
        var loc = new LatLng(rallyingPoint.Location.Coordinates.Latitude, rallyingPoint.Location.Coordinates.Longitude);
        return new RallyingPoint(rallyingPoint.Id.ToString(), rallyingPoint.Label, loc, rallyingPoint.IsActive);
    }
}