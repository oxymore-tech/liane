using System;
using System.Threading.Tasks;
using Liane.Api.Auth;
using Liane.Api.Image;
using Liane.Api.Trip;
using Liane.Service.Internal.Util;
using Microsoft.Extensions.Logging;

namespace Liane.Service.Internal.User;

public sealed class DeleteAccountServiceImpl(ICurrentContext currentContext, IImageService imageService, IUserService userService, ITripService tripService, ILogger<DeleteAccountServiceImpl> logger)
  : IDeleteAccountService
{
  public async Task DeleteCurrent()
  {
    var id = currentContext.CurrentUser().Id;
    await tripService.CancelAllTrips(id);
    try
    {
      await imageService.DeleteProfile(id);
    }
    catch (Exception e)
    {
      logger.LogError("Could not delete profile picture for user {Id}: {Message}", id, e.Message);
    }

    await userService.Delete(id);
  }
}