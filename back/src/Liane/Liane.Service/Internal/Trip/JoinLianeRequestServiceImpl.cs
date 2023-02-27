using System;
using System.Threading.Tasks;
using Liane.Api.Notification;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

public class JoinLianeRequestServiceImpl : MongoCrudEntityService<JoinLianeRequest>, IJoinLianeRequestService

{
  private readonly INotificationService notificationService;
  private readonly ILianeService lianeService;
  public JoinLianeRequestServiceImpl(IMongoDatabase mongo, INotificationService notificationService, ILianeService lianeService) : base(mongo)
  {
    this.notificationService = notificationService;
    this.lianeService = lianeService;
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
      await notificationService.Create<Ref<JoinLianeRequest>>(created, lianeDriver);
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
}