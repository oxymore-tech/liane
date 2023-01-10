using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

public class LianeServiceImpl: ILianeService
{
    
    private readonly ICurrentContext currentContext;
    private readonly IMongoDatabase mongo;
    private readonly IRoutingService routingService;

    public LianeServiceImpl(MongoSettings settings, ICurrentContext currentContext, IRoutingService routingService)
    {
        this.currentContext = currentContext;
        this.routingService = routingService;
        mongo = settings.GetDatabase();
    }

    async Task<ImmutableSortedSet<WayPoint>> GetWayPointsSet(Ref<Api.User.User> driver, IEnumerable<LianeMember> lianeMembers)
    {
        var set = new SortedSet<RallyingPoint>();
        Ref<RallyingPoint>? from = null;
        Ref<RallyingPoint>? to = null;
        var wayPoints = new HashSet< Ref<RallyingPoint>>();

        foreach (var member in lianeMembers)
        {
            if (member.User.Id == driver.Id)
            {
                from = member.From;
                to = member.To;
            }
            else
            {
                wayPoints.Add(member.From);
                wayPoints.Add(member.To);
            }
        }

        if (from == null || to == null)
        {
            throw new ArgumentException();
        }

        return await routingService.GetTrip(from, to, wayPoints.ToImmutableHashSet());

    }

    async Task<Api.Trip.Liane> DbToApi(LianeDb liane)
    {
        var wayPoints = await GetWayPointsSet(liane.DriverData.User, liane.Members);
        return new Api.Trip.Liane(Id: liane.Id, Members: liane.Members, CreatedBy: liane.CreatedBy, CreatedAt: liane.CreatedAt, DepartureTime: liane.DepartureTime, ReturnTime: liane.ReturnTime, Driver: liane.DriverData.User, WayPoints: wayPoints);

    }

    public async Task<Api.Trip.Liane> Get(string id)
    {
        var lianeDb = await mongo.GetCollection<LianeDb>().Find(i => i.Id == id).FirstOrDefaultAsync();
        return await DbToApi(lianeDb);
    }
    
    public async Task<ImmutableList<Api.Trip.Liane>> List()
    {
        // Get Lianes for current user
        var userId = currentContext.CurrentUser().Id;
        var filter = Builders<LianeDb>.Filter.Eq("Members", userId);
        var cursorAsync = await mongo.GetCollection<LianeDb>()
            .Find(filter)
            .ToCursorAsync();
       
        // Get calculated Route across wayPoints
        var lianes = new List<Api.Trip.Liane>();
        foreach (var liane in cursorAsync.ToEnumerable())
        {
            lianes.Add(await DbToApi(liane));
        }

        return lianes.ToImmutableList();
    }

    public async Task<Api.Trip.Liane> Create(LianeRequest lianeRequest)
    {
        // Add new Liane
        var id = ObjectId.GenerateNewId()
            .ToString();
        var createdBy = currentContext.CurrentUser().Id;
        var createdAt = DateTime.UtcNow;
        var members = new List<LianeMember> { new(createdBy, lianeRequest.From, lianeRequest.To) };
        var driverData = new DriverData(createdBy, lianeRequest.DriverCapacity);
        var created = new LianeDb(id, createdBy, createdAt, lianeRequest.DepartureTime,
            lianeRequest.ReturnTime, members.ToImmutableList(), driverData );

        await mongo.GetCollection<LianeDb>()
            .InsertOneAsync(created);
        
        
        // Handle Share with contacts 
        // TODO

        return await DbToApi(created);
        
    }
}