using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Util;
using Liane.Web.Internal.AccessLevel;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

public sealed class LianeServiceImpl : MongoCrudEntityService<LianeRequest, LianeDb, Api.Trip.Liane>, ILianeService
{
  private readonly ICurrentContext currentContext;
  private readonly IRoutingService routingService;
  private readonly IRallyingPointService rallyingPointService;

  public LianeServiceImpl(IMongoDatabase mongo, IRoutingService routingService, ICurrentContext currentContext, IRallyingPointService rallyingPointService) : base(mongo)
  {
    this.routingService = routingService;
    this.currentContext = currentContext;
    this.rallyingPointService = rallyingPointService;
  }

  public async Task<PaginatedResponse<Api.Trip.Liane, DatetimeCursor>> List(Filter filter, Pagination<DatetimeCursor> pagination)
  {
    var rallyingPoints = (await rallyingPointService.FindSurroundingPoints(ImmutableList.Create(filter.From, filter.To).Where(p => p is not null).Select(r => r!)))
      .Select(r => (Ref<RallyingPoint>)r)
      .ToImmutableHashSet();

    var f = Builders<LianeDb>.Filter.In("Members.From", rallyingPoints)
            | Builders<LianeDb>.Filter.In("Members.To", rallyingPoints);

    if (filter.GoTime is not null)
    {
      var date = filter.GoTime.Value.Date;
      var dayAfter = filter.GoTime.Value.Date.AddDays(1);
      f &= Builders<LianeDb>.Filter.Gte(l => l.DepartureTime, date)
           & Builders<LianeDb>.Filter.Lt(l => l.DepartureTime, dayAfter);
    }
    
    var lianes = await DatetimePagination<LianeDb>.List(Mongo, pagination, l => l.DepartureTime, f);
    return await lianes.SelectAsync(ToOutputDto);
  }

  public async Task<PaginatedResponse<Api.Trip.Liane, DatetimeCursor>> ListForCurrentUser(Pagination<DatetimeCursor> pagination)
  {
    var currentUser = currentContext.CurrentUser();
    return await ListForMemberUser(currentUser.Id, pagination);
  }

  public async Task<PaginatedResponse<Api.Trip.Liane, DatetimeCursor>> ListForMemberUser(string userId, Pagination<DatetimeCursor> pagination)
  {
    var filter = GetAccessLevelFilter(userId, ResourceAccessLevel.Member);

    var paginatedLianes = await DatetimePagination<LianeDb>.List(Mongo, pagination, l => l.DepartureTime, filter);
    return await paginatedLianes.SelectAsync(ToOutputDto);
  }

  private async Task<ImmutableSortedSet<WayPoint>> GetWayPointsSet(Ref<Api.User.User> driver, IEnumerable<LianeMember> lianeMembers)
  {
    Ref<RallyingPoint>? from = null;
    Ref<RallyingPoint>? to = null;
    var wayPoints = new HashSet<Ref<RallyingPoint>>();

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
    return new Api.Trip.Liane(Id: liane.Id, Members: liane.Members, CreatedBy: liane.CreatedBy!, CreatedAt: liane.CreatedAt, DepartureTime: liane.DepartureTime, ReturnTime: liane.ReturnTime,
      Driver: liane.DriverData.User, WayPoints: wayPoints);
  }

  protected override LianeDb ToDb(LianeRequest lianeRequest, string originalId, DateTime createdAt, string createdBy)
  {
    var members = new List<LianeMember> { new(createdBy, lianeRequest.From, lianeRequest.To) };
    var driverData = new DriverData(createdBy, lianeRequest.DriverCapacity);
    return new LianeDb(originalId, createdBy, createdAt, lianeRequest.DepartureTime,
      lianeRequest.ReturnTime, members.ToImmutableList(), driverData);
  }
}