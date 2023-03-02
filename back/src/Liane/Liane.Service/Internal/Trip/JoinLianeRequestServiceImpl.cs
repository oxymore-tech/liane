using System;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Liane.Api.Notification;
using Liane.Api.Trip;
using Liane.Api.User;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Web.Internal.AccessLevel;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

public class JoinLianeRequestServiceImpl : MongoCrudEntityService<JoinLianeRequest>, IJoinLianeRequestService

{
  private readonly INotificationService notificationService;
  private readonly ILianeService lianeService;
  private readonly IUserService userService;
  private readonly IRallyingPointService rallyingPointService;
  public JoinLianeRequestServiceImpl(IMongoDatabase mongo, INotificationService notificationService, ILianeService lianeService, IUserService userService, IRallyingPointService rallyingPointService) : base(mongo)
  {
    this.notificationService = notificationService;
    this.lianeService = lianeService;
    this.userService = userService;
    this.rallyingPointService = rallyingPointService;
  }

  public new async Task<JoinLianeRequest> Create(JoinLianeRequest obj, string ownerId)
  {
    var created = await base.Create(obj, ownerId);
    // Create associated notification for Liane owner asynchronously

    var _ = Task.Run(async () =>
    {
      // TODO send to default driver or owner ?
      // Send to default driver
      var lianeDriver = (await ResolveRef<LianeDb>(created.TargetLiane))!.DriverData.User;
      await notificationService.Create(created, lianeDriver);
    });
    return created;
  }


  protected override JoinLianeRequest ToDb(JoinLianeRequest inputDto, string originalId, DateTime createdAt, string createdBy)
  {
    return inputDto with { Id = originalId, CreatedAt = createdAt, CreatedBy = createdBy };
  }

  private async Task<JoinLianeRequest> UpdateAcceptedStatus(Ref<Api.User.User> userId, Ref<JoinLianeRequest> request, bool status)
  {
    // TODO check user can accept request 

    // Update request status and notify request sender
    var updated = await Mongo.GetCollection<JoinLianeRequest>()
      .FindOneAndUpdateAsync(r => r.Id == request.Id,
        Builders<JoinLianeRequest>.Update.Set(r => r.Accepted, status));
    
    // Notify sender asynchronously
    var _ = Task.Run(() => notificationService.Create(updated, updated.CreatedBy!));
    
    return updated;
  }

  public async Task<Api.Trip.Liane> AcceptJoinRequest(Ref<Api.User.User> userId, Ref<JoinLianeRequest> request)
  {
    var accepted = await UpdateAcceptedStatus(userId, request, true);
    
    // Add sender to Liane
    var newMember = new LianeMember(accepted.CreatedBy!, accepted.From, accepted.To, accepted.TakeReturnTrip, accepted.Seats);
    return await lianeService.AddMember(accepted.TargetLiane, newMember);
  }

  public async Task RefuseJoinRequest(Ref<Api.User.User> userId, Ref<JoinLianeRequest> request)
  {
    await UpdateAcceptedStatus(userId, request, false);
  }

  public async Task<PaginatedResponse<JoinLianeRequestDetailed>> ListUserRequests(Ref<Api.User.User> fromUser, Pagination pagination)
  {
    var filter = GetAccessLevelFilter(fromUser, ResourceAccessLevel.Owner);

    var paginated = await Mongo.Paginate<JoinLianeRequest>(pagination, r => r.CreatedAt, filter, false);

    // Resolve liane
    return await paginated.SelectAsync(MapDetailedRequest); //TODO bad perf here 
  }

  public async Task<PaginatedResponse<JoinLianeRequest>> ListLianeRequests(Ref<Api.Trip.Liane> liane, Pagination pagination)
  {
    Expression<Func<JoinLianeRequest, bool>> filter = r => r.TargetLiane.Id == liane.Id;
    
    var paginated = await Mongo.Paginate<JoinLianeRequest>(pagination, r => r.CreatedAt, filter, false);

    // Resolve users 
    return await paginated.SelectAsync(async r => r with
    {
      To = await rallyingPointService.Get(r.To),
      From = await rallyingPointService.Get(r.From), 
      CreatedBy = await userService.Get(r.CreatedBy!)
    }); //TODO(perf): use single db call 
  }

  private async Task<JoinLianeRequestDetailed> MapDetailedRequest(JoinLianeRequest found)
  {
    var from = await rallyingPointService.Get(found.From);
    var to = await rallyingPointService.Get(found.To);
    var matchData = await lianeService.GetNewTrip(found.TargetLiane, from, to, found.Seats > 0);
    if (matchData is null) throw new ArgumentException("This request is no longer compatible with target Liane");
    var wayPoints = matchData.Value.wayPoints;
    var matchType = matchData.Value.matchType;
    return new JoinLianeRequestDetailed(found.Id!, from, to,
      await lianeService.Get(found.TargetLiane),
      await userService.Get(found.CreatedBy!),
      found.CreatedAt, found.Seats, found.TakeReturnTrip, found.Message, found.Accepted, matchType, wayPoints
    );
  }

  public async Task<JoinLianeRequestDetailed> GetDetailedRequest(Ref<JoinLianeRequest> request)
  {
    var found = await Mongo.GetCollection<JoinLianeRequest>().Find(r => r.Id == request.Id).FirstOrDefaultAsync();
    return await MapDetailedRequest(found);
  }
  
}