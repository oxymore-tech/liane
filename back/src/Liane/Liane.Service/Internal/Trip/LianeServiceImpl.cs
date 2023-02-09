using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Web.Internal.AccessLevel;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

public class LianeServiceImpl: MongoCrudEntityService<LianeRequest, LianeDb, Api.Trip.Liane>, ILianeService
{
  private readonly IRoutingService routingService;

    public LianeServiceImpl(IMongoDatabase mongo, IRoutingService routingService): base(mongo)
    {
      this.routingService = routingService;
    }

    private async Task<ImmutableSortedSet<WayPoint>> GetWayPointsSet(Ref<Api.User.User> driver, IEnumerable<LianeMember> lianeMembers)
    {
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

    protected override async Task<Api.Trip.Liane> ToOutputDto(LianeDb liane)
    {
        var wayPoints = await GetWayPointsSet(liane.DriverData.User, liane.Members);
        return new Api.Trip.Liane(Id: liane.Id, Members: liane.Members, CreatedBy: liane.CreatedBy!, CreatedAt: liane.CreatedAt, DepartureTime: liane.DepartureTime, ReturnTime: liane.ReturnTime, Driver: liane.DriverData.User, WayPoints: wayPoints);

    }

    protected override LianeDb ToDb(LianeRequest lianeRequest, string originalId, DateTime createdAt, string createdBy)
    {
          var members = new List<LianeMember> { new(createdBy, lianeRequest.From, lianeRequest.To) };
           var driverData = new DriverData(createdBy, lianeRequest.DriverCapacity);
           return new LianeDb(originalId, createdBy, createdAt, lianeRequest.DepartureTime,
             lianeRequest.ReturnTime, members.ToImmutableList(), driverData );
    }

    public async Task<PaginatedResponse<Api.Trip.Liane, DatetimeCursor>> ListForMemberUser(Ref<Api.User.User> user, PaginatedRequestParams<DatetimeCursor> pagination)
    {
      var filter = GetAccessLevelFilter(user.Id, ResourceAccessLevel.Member);

      var paginatedLianes = await DatetimePagination<LianeDb>.List(Mongo, pagination, l => l.DepartureTime, filter);
      return await paginatedLianes.ConvertDataAsync(ToOutputDto);
      
    }

}