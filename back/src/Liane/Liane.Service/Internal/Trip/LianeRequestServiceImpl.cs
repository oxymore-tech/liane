using System;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.User;
using Liane.Api.Util.Pagination;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Trip;

public sealed class LianeRequestServiceImpl : ILianeRequestService
{
  private readonly IEventService eventService;
  private readonly IRallyingPointService rallyingPointService;
  private readonly ILianeService lianeService;
  private readonly IUserService userService;

  public LianeRequestServiceImpl(IEventService eventService, IRallyingPointService rallyingPointService, ILianeService lianeService, IUserService userService)
  {
    this.eventService = eventService;
    this.rallyingPointService = rallyingPointService;
    this.lianeService = lianeService;
    this.userService = userService;
  }

  public async Task<PaginatedResponse<JoinLianeRequest>> List(Pagination pagination)
  {
    var paginated = await eventService.List(new EventFilter(false, null, new TypeOf<LianeEvent.JoinRequest>()), pagination);
    return await paginated.SelectAsync(Resolve);
  }

  public async Task<JoinLianeRequest> Get(Ref<Api.Event.Event> e)
  {
    return await Resolve(await eventService.Get(e));
  }

  public async Task Delete(Ref<Api.Event.Event> id)
  {
    await eventService.Delete(id);
  }

  private async Task<JoinLianeRequest> Resolve(Api.Event.Event e)
  {
    var joinRequest = (LianeEvent.JoinRequest)e.LianeEvent;
    var from = await rallyingPointService.Get(joinRequest.From);
    var to = await rallyingPointService.Get(joinRequest.To);
    var liane = await lianeService.Get(joinRequest.Liane);
    var createdBy = await userService.Get(e.CreatedBy);

    var match = await lianeService.GetNewTrip(liane, from, to, joinRequest.Seats > 0);
    if (match is null)
    {
      throw new ArgumentException("This request is no longer compatible with target Liane");
    }

    return new JoinLianeRequest(e.Id!, from, to, liane, createdBy, e.CreatedAt!, joinRequest.Seats, joinRequest.TakeReturnTrip, joinRequest.Message, false, match);
  }
}