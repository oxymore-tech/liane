using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Util;
using Liane.Web.Internal.AccessLevel;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

public sealed class LianeServiceImpl : MongoCrudEntityService<LianeRequest, LianeDb, Api.Trip.Liane>, ILianeService
{
  public const int MaxDeltaInSeconds = 15 * 3600;

  private readonly ICurrentContext currentContext;
  private readonly IRoutingService routingService;
  private readonly IRallyingPointService rallyingPointService;

  public LianeServiceImpl(IMongoDatabase mongo, IRoutingService routingService, ICurrentContext currentContext, IRallyingPointService rallyingPointService) : base(mongo)
  {
    this.routingService = routingService;
    this.currentContext = currentContext;
    this.rallyingPointService = rallyingPointService;
  }

  public async Task<PaginatedResponse<LianeMatch>> Match(Filter filter, Pagination pagination)
  {
    var from = await rallyingPointService.Get(filter.From);
    var to = await rallyingPointService.Get(filter.To);

    var setFrom = await rallyingPointService.List(from.Location, null);
    var setTo = await rallyingPointService.List(to.Location, null);

    var f = (Builders<LianeDb>.Filter.In("Members.From", setFrom) | Builders<LianeDb>.Filter.In("Members.To", setFrom))
            & (Builders<LianeDb>.Filter.In("Members.From", setTo) | Builders<LianeDb>.Filter.In("Members.To", setTo));

    var date = filter.TargetTime.DateTime.Date;
    var dayAfter = filter.TargetTime.DateTime.Date.AddDays(1);
    f &= Builders<LianeDb>.Filter.Gte(l => l.DepartureTime, date)
         & Builders<LianeDb>.Filter.Lt(l => l.DepartureTime, dayAfter);

    var currentUser = currentContext.CurrentUser();

    var lianes = await Mongo.GetCollection<LianeDb>()
      .Find(f)
      .SelectAsync(l => MatchLiane(l, currentUser.Id, from, to));

    return lianes
      .Where(l => l is not null)
      .Cast<LianeMatch>()
      .ToImmutableList()
      .Paginate(pagination, l => l.DeltaInSeconds);
  }

  public async Task<PaginatedResponse<Api.Trip.Liane>> ListForCurrentUser(Pagination pagination)
  {
    var currentUser = currentContext.CurrentUser();
    return await ListForMemberUser(currentUser.Id, pagination);
  }

  public async Task<PaginatedResponse<Api.Trip.Liane>> ListForMemberUser(string userId, Pagination pagination)
  {
    var filter = GetAccessLevelFilter(userId, ResourceAccessLevel.Member);

    var paginatedLianes = await Mongo.Paginate(pagination, l => l.DepartureTime, filter);
    return await paginatedLianes.SelectAsync(MapEntity);
  }

  private async Task<ImmutableSortedSet<WayPoint>> GetWayPoints(Ref<Api.User.User> driver, IEnumerable<LianeMember> lianeMembers)
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

  protected override async Task<Api.Trip.Liane> MapEntity(LianeDb liane)
  {
    var driver = liane.DriverData.User;
    var wayPoints = await GetWayPoints(driver, liane.Members);
    return new Api.Trip.Liane(liane.Id, liane.CreatedBy!, liane.CreatedAt, liane.DepartureTime, liane.ReturnTime, wayPoints, liane.Members, driver);
  }

  protected override LianeDb ToDb(LianeRequest lianeRequest, string originalId, DateTime createdAt, string createdBy)
  {
    var members = new List<LianeMember> { new(createdBy, lianeRequest.From, lianeRequest.To) };
    var driverData = new DriverData(createdBy, lianeRequest.DriverCapacity);
    return new LianeDb(originalId, createdBy, createdAt, lianeRequest.DepartureTime,
      lianeRequest.ReturnTime, members.ToImmutableList(), driverData);
  }

  private async Task<LianeMatch?> MatchLiane(LianeDb lianeDb, Ref<Api.User.User> currentUser, RallyingPoint from, RallyingPoint to)
  {
    var driver = lianeDb.DriverData.User;
    var wayPoints = await GetWayPoints(driver, lianeDb.Members);
    var newWayPoints = await GetWayPoints(driver, lianeDb.Members.Add(new LianeMember(currentUser, from, to)));
    if (!newWayPoints.IsWrongDirection(from, to))
    {
      return null;
    }

    var delta = newWayPoints.TotalDuration() - wayPoints.TotalDuration();
    if (delta > MaxDeltaInSeconds)
    {
      return null;
    }

    var liane = new Api.Trip.Liane(lianeDb.Id, lianeDb.CreatedBy!, lianeDb.CreatedAt, lianeDb.DepartureTime, lianeDb.ReturnTime, newWayPoints, lianeDb.Members, driver);
    return new LianeMatch(liane, delta);
  }
}