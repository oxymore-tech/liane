using System;
using System.Collections.Immutable;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Ref;
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
    var reminders = await GetNextReminders(now, TimeSpan.FromMinutes(5));
    foreach (var (reminder, members) in reminders)
    {
      var recipients = members.Select(u => new Recipient(u, null)).ToImmutableList();
      var notification = new Notification.Reminder(null, null, DateTime.UtcNow, recipients, ImmutableHashSet<Answer>.Empty, "Départ dans 5 minutes",
        $"Vous avez RDV dans 5 minutes à '{reminder.RallyingPoint.Label}'.", reminder);
      await notificationService.Create(notification);
    }
  }

  private Task<ImmutableDictionary<Reminder, ImmutableList<Ref<Api.User.User>>>> GetNextReminders(DateTime fromNow, TimeSpan window)
  {
    return Task.FromResult(ImmutableDictionary<Reminder, ImmutableList<Ref<Api.User.User>>>.Empty);
  }
}