using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.RallyingPoints;
using Liane.Api.Trip;
using Liane.Api.Util.Http;
using Liane.Service.Internal.Mongo;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

public sealed class TripIntentServiceImpl : ITripIntentService
{
    private readonly ICurrentContext currentContext;
    private readonly IMongoDatabase mongo;
    private readonly IRallyingPointService rallyingPointService;

    public TripIntentServiceImpl(MongoSettings settings, ICurrentContext currentContext, IRallyingPointService rallyingPointService)
    {
        this.currentContext = currentContext;
        this.rallyingPointService = rallyingPointService;
        mongo = settings.GetDatabase();
    }

    public async Task<TripIntent> Create(TripIntent tripIntent)
    {
        var id = ObjectId.GenerateNewId();

        var from = await rallyingPointService.Get(tripIntent.From);
        var to = await rallyingPointService.Get(tripIntent.To);

        var createdBy = currentContext.CurrentUser().Id;
        var createdAt = DateTime.UtcNow;
        var created = tripIntent with { Id = id.ToString(), From = from, To = to, CreatedBy = createdBy, CreatedAt = createdAt };

        await mongo.GetCollection<DbTripIntent>()
            .InsertOneAsync(new DbTripIntent(id, tripIntent.Title, tripIntent.From, tripIntent.To, tripIntent.GoTime, tripIntent.ReturnTime, createdBy, createdAt));

        return created;
    }

    public async Task Delete(string id)
    {
        await mongo.GetCollection<DbTripIntent>().DeleteOneAsync(ti => ti.Id == ObjectId.Parse(id));
    }

    public async Task<ImmutableList<TripIntent>> List()
    {
        var tripIntents = new List<TripIntent>();

        foreach (var dbTripIntent in (await mongo.GetCollection<DbTripIntent>()
                     .FindAsync(i => true))
                 .ToEnumerable())
        {
            tripIntents.Add(await ToTripIntent(dbTripIntent));
        }

        return tripIntents.ToImmutableList();
    }

    private async Task<TripIntent> ToTripIntent(DbTripIntent dbTripIntent)
    {
        var from = await rallyingPointService.Get(dbTripIntent.From);
        var to = await rallyingPointService.Get(dbTripIntent.To);
        return new TripIntent(dbTripIntent.Id.ToString(), null, from, to, dbTripIntent.GoTime, dbTripIntent.ReturnTime, dbTripIntent.CreatedBy, dbTripIntent.CreatedAt);
    }
}