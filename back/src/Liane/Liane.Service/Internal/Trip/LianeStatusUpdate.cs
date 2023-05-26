using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Trip;
using Liane.Api.User;
using Liane.Api.Util;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

public sealed class LianeStatusUpdate : CronJobService
{
  private readonly IMongoDatabase mongo;
  private readonly INotificationService notificationService;
  private readonly IRallyingPointService rallyingPointService;
  private readonly IUserService userService;

  public LianeStatusUpdate(ILogger<LianeStatusUpdate> logger, IMongoDatabase mongo, INotificationService notificationService, IRallyingPointService rallyingPointService,
    IUserService userService) : base(logger, "* * * * *",
    false)
  {
    this.mongo = mongo;
    this.notificationService = notificationService;
    this.rallyingPointService = rallyingPointService;
    this.userService = userService;
  }

  protected override Task DoWork(CancellationToken cancellationToken) => Update(DateTime.UtcNow, TimeSpan.FromMinutes(5));

  public async Task Update(DateTime from, TimeSpan window)
  {
    var to = from.Add(window);
    await UpdateActiveLianes(from, to);
    await UpdateFinishedLianes(from);
  }

  private async Task UpdateFinishedLianes(DateTime from)
  {
    var limit = from.AddHours(-1);
    var filter = Builders<LianeDb>.Filter.Where(l => l.State == LianeState.NotStarted || l.State == LianeState.Started)
                 & Builders<LianeDb>.Filter.ElemMatch(l => l.WayPoints, w => w.Eta < limit);
    var lianes = await mongo.GetCollection<LianeDb>()
      .Find(filter)
      .ToListAsync();

    var finishedLianes = lianes
      .Where(l => l.WayPoints is null || l.WayPoints.Last().Eta < limit)
      .ToImmutableList();

    if (finishedLianes.IsEmpty)
    {
      return;
    }

    await notificationService.CleanNotifications(finishedLianes.Select(l => (Ref<Api.Trip.Liane>)l.Id).ToImmutableList());

    await mongo.GetCollection<LianeDb>()
      .BulkWriteAsync(finishedLianes
        .Select(liane => new UpdateOneModel<LianeDb>(
          Builders<LianeDb>.Filter.Where(l => l.Id == liane.Id),
          Builders<LianeDb>.Update.Set(l => l.State, LianeState.Finished))
        ));
  }

  private async Task UpdateActiveLianes(DateTime from, DateTime to)
  {
    var filter = Builders<LianeDb>.Filter.Where(l => l.State == LianeState.NotStarted || l.State == LianeState.Started)
                 & Builders<LianeDb>.Filter.ElemMatch(l => l.WayPoints, w => w.Eta > from && w.Eta <= to);
    var activeLianes = await mongo.GetCollection<LianeDb>()
      .Find(filter)
      .ToListAsync();
    await UpdateLianeAndSendReminder(activeLianes, from, to);
  }

  private async Task UpdateLianeAndSendReminder(List<LianeDb> lianes, DateTime from, DateTime to)
  {
    var lianeUpdates = new List<WriteModel<LianeDb>>();
    var reminders = new List<Notification.Reminder>();

    foreach (var liane in lianes)
    {
      if (!liane.Pings.IsEmpty && liane.State == LianeState.NotStarted && liane.DepartureTime < DateTime.UtcNow)
      {
        lianeUpdates.Add(new UpdateOneModel<LianeDb>(Builders<LianeDb>.Filter.Eq(l => l.Id, liane.Id), Builders<LianeDb>.Update.Set(l => l.State, LianeState.Started)));
      }

      if (liane.WayPoints is null)
      {
        return;
      }

      foreach (var wayPoint in liane.WayPoints.Where(w => w.Eta > from && w.Eta <= to))
      {
        var members = await GetRecipients(liane, wayPoint);
        if (members.IsEmpty)
        {
          continue;
        }

        var rallyingPoint = await wayPoint.RallyingPoint.Resolve(rallyingPointService.Get);
        reminders.Add(CreateReminder(from, "Départ dans 5 minutes", $"Vous avez RDV dans 5 minutes à '{rallyingPoint.Label}'.", members, new Reminder(liane.Id, wayPoint.RallyingPoint, wayPoint.Eta)));
      }
    }

    await notificationService.SendReminders(from, reminders);

    if (lianeUpdates.Count > 0)
    {
      await mongo.GetCollection<LianeDb>()
        .BulkWriteAsync(lianeUpdates);
    }
  }

  private static Notification.Reminder CreateReminder(DateTime now, string title, string message, ImmutableList<Ref<Api.User.User>> to, Reminder reminder)
  {
    return new Notification.Reminder(null, null, now, to.Select(t => new Recipient(t, null)).ToImmutableList(), ImmutableHashSet<Answer>.Empty, title, message, reminder);
  }

  private async Task<ImmutableList<Ref<Api.User.User>>> GetRecipients(LianeDb liane, WayPointDb wayPoint)
  {
    var list = new List<Ref<Api.User.User>>();
    foreach (var r in liane.Members.Where(m => m.From.Id == wayPoint.RallyingPoint.Id)
               .Select(m => m.User))
    {
      var user = await userService.Get(r);
      if ((user.Pseudo ?? "").StartsWith("Bot "))
      {
        continue;
      }

      list.Add(r);
    }

    return list.ToImmutableList();
  }
}