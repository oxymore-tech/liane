using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Liane;
using Liane.Api.RallyingPoint;
using Liane.Api.Routing;
using Liane.Api.Util.Http;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Osrm;
using Liane.Service.Models;
using MongoDB.Driver;

namespace Liane.Service.Internal.Liane;

public class LianeServiceImpl: ILianeService
{
    
    private readonly ICurrentContext currentContext;
    private readonly IMongoDatabase mongo;
    private readonly IRallyingPointService rallyingPointService;
    private readonly IRoutingService routingService;

    public LianeServiceImpl(MongoSettings settings, ICurrentContext currentContext, IRallyingPointService rallyingPointService, IRoutingService routingService)
    {
        this.currentContext = currentContext;
        this.rallyingPointService = rallyingPointService;
        this.routingService = routingService;
        mongo = settings.GetDatabase();
    }

    ImmutableSortedSet<Api.RallyingPoint.RallyingPoint> GetWayPointsSet(Ref<Api.User.User> driver, IEnumerable<LianeMember> lianeMembers)
    {
        var set = new SortedSet<Api.RallyingPoint.RallyingPoint>();
        Ref<Api.RallyingPoint.RallyingPoint> from;
        Ref<Api.RallyingPoint.RallyingPoint> to;
        var wayPoints = new HashSet< Ref<Api.RallyingPoint.RallyingPoint>>();

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

    }
    
    public async Task<ImmutableList<Api.Liane.UserLianeResponse>> List()
    {
        // Get Lianes for current user
        var userId = currentContext.CurrentUser().Id;
        var cursorAsync = await mongo.GetCollection<Models.Liane>()
            .Find(i => i.Members.Exists(m => (string)m.User == userId))
            .ToCursorAsync();
       
        // Get calculated Route across wayPoints

        var lianes = cursorAsync.ToEnumerable().Select(liane =>
        {
            // Fetch route from RouteService
            
            var wayPoints = new List<LianeWayPoint>().ToImmutableList();

            return new Api.Liane.UserLianeResponse(Id: liane.Id, DepartureTime: liane.DepartureTime, ReturnTime: liane.ReturnTime, Driver: liane.Driver, WayPoints: wayPoints);
        });
       
        return lianes.ToImmutableList();
    }

    public Task<Api.Liane.UserLianeResponse> Create(LianeRequest lianeRequest)
    {
        // Add new Liane
        
        // Handle Share with contacts 
        throw new System.NotImplementedException();
    }
}