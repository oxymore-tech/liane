using System;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Liane.Api.Event;
using Liane.Api.Image;
using Liane.Api.Trip;
using Liane.Api.User;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Logging;

namespace Liane.Service.Internal.User;

public sealed class DeleteAccountServiceImpl : IDeleteAccountService
{
  private readonly ICurrentContext currentContext;
  private readonly IImageService imageService;
  private readonly IUserService userService;
  private readonly ILianeService lianeService;
  private readonly ILianeRecurrenceService lianeRecurrenceService;
  private readonly ILogger<DeleteAccountServiceImpl> logger;

  public DeleteAccountServiceImpl(ICurrentContext currentContext, IImageService imageService, IUserService userService, ILianeService lianeService, ILianeRecurrenceService lianeRecurrenceService, ILogger<DeleteAccountServiceImpl> logger)
  {
    this.currentContext = currentContext;
    this.imageService = imageService;
    this.userService = userService;
    this.lianeService = lianeService;
    this.lianeRecurrenceService = lianeRecurrenceService;
    this.logger = logger;
  }

  public async Task DeleteCurrent()
  {
    var id = currentContext.CurrentUser().Id;
    // Clear lianes
    await lianeService.CancelAllTrips(id);
    await lianeRecurrenceService.ClearForMember(id);
    try
    {
      await imageService.DeleteProfile(id);
    } catch (Exception e)
    {
      logger.LogError("Could not delete profile picture for user {Id}: {Message}", id, e.Message);
    }

    await userService.Delete(id);
  }
}