using System;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Event;
using Liane.Api.Image;
using Liane.Api.Trip;
using Liane.Api.User;
using Liane.Service.Internal.Util;

namespace Liane.Service.Internal.User;

public sealed class DeleteAccountServiceImpl : IDeleteAccountService
{
  private readonly ICurrentContext currentContext;
  private readonly IImageService imageService;
  private readonly IUserService userService;
  private readonly ILianeService lianeService;
  private readonly ILianeRecurrenceService lianeRecurrenceService;

  public DeleteAccountServiceImpl(ICurrentContext currentContext, IImageService imageService, IUserService userService, ILianeService lianeService, ILianeRecurrenceService lianeRecurrenceService)
  {
    this.currentContext = currentContext;
    this.imageService = imageService;
    this.userService = userService;
    this.lianeService = lianeService;
    this.lianeRecurrenceService = lianeRecurrenceService;
  }

  public async Task DeleteCurrent()
  {
    var id = currentContext.CurrentUser().Id;
    await imageService.DeleteProfile(id);
    await userService.Delete(id);
    await lianeService.RemoveMember(id);
    await lianeRecurrenceService.ClearForMember(id);
  }
}