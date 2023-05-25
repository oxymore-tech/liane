using System;
using System.Threading;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Util;
using Microsoft.Extensions.Logging;

namespace Liane.Service.Internal.Trip.Event;

public sealed class LianeReminder : CronJobService
{
  private readonly ILianeService lianeService;
  private readonly INotificationService notificationService;

  public LianeReminder(ILogger<LianeReminder> logger, ILianeService lianeService, INotificationService notificationService) : base(logger, "* * * * *", false)
  {
    this.lianeService = lianeService;
    this.notificationService = notificationService;
  }

  protected override async Task DoWork(CancellationToken cancellationToken)
  {
    var now = DateTime.UtcNow;
    var appointments = await lianeService.GetNextAppointments(now, TimeSpan.FromMinutes(5));
    foreach (var (appointment, to) in appointments)
    {
      await notificationService.SendReminder("Départ dans 5 minutes",
        $"Vous avez RDV dans 5 minutes à '{appointment.RallyingPoint.Label}'.",
        to,
        new Reminder(appointment.Liane, appointment.RallyingPoint, appointment.At));
    }
  }
}