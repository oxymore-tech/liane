using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Util;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

public sealed class TripIntentServiceImpl : ITripIntentService
{
    private readonly ICurrentContext currentContext;
    private readonly IMongoDatabase mongo;
    private readonly IRallyingPointService rallyingPointService;

    public TripIntentServiceImpl(IMongoDatabase mongo, ICurrentContext currentContext, IRallyingPointService rallyingPointService)
    {
        this.currentContext = currentContext;
        this.rallyingPointService = rallyingPointService;
        this.mongo = mongo;
    }

    public async Task<TripIntent> Create(TripIntent tripIntent)
    {
        var from = await rallyingPointService.Get(tripIntent.From);
        var to = await rallyingPointService.Get(tripIntent.To);

        var id = ObjectId.GenerateNewId()
            .ToString();
        var createdBy = currentContext.CurrentUser().Id;
        var createdAt = DateTime.UtcNow;
        var created = tripIntent with { Id = id, From = from, To = to, CreatedBy = createdBy, CreatedAt = createdAt };

        await mongo.GetCollection<TripIntent>()
            .InsertOneAsync(created);

        return created;
    }

    public async Task Delete(string id)
    {
        await mongo.GetCollection<TripIntent>()
            .DeleteOneAsync(ti => ti.Id == id);
    }

    public async Task<ImmutableList<TripIntent>> List()
    {
        var cursorAsync = await mongo.GetCollection<TripIntent>()
            .Find(i => true)
            .ToCursorAsync();
        var tripIntents = new List<TripIntent>();
        foreach (var tripIntent in cursorAsync.ToEnumerable())
        {
            tripIntents.Add(await ResolveRallyingPoints(tripIntent));
        }

        return tripIntents
            .ToImmutableList();
    }

    private async Task<TripIntent> ResolveRallyingPoints(TripIntent tripIntent)
    {
        var from = await rallyingPointService.Get(tripIntent.From);
        var to = await rallyingPointService.Get(tripIntent.To);
        return tripIntent with { From = from, To = to };
    }
}