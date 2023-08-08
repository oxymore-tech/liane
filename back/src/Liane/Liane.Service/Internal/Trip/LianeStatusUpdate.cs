using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.User;
using Liane.Api.Util;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Postgis;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace Liane.Service.Internal.Trip;

public sealed class LianeStatusUpdate : CronJobService
{
  private readonly IMongoDatabase mongo;
  private readonly INotificationService notificationService;
  private readonly IRallyingPointService rallyingPointService;
  private readonly IUserService userService;
  private readonly IPostgisService postgisService;

  private const int ReminderDelayInMinutes = 5;

  public LianeStatusUpdate(ILogger<LianeStatusUpdate> logger, IMongoDatabase mongo, INotificationService notificationService, IRallyingPointService rallyingPointService,
    IUserService userService, IPostgisService postgisService) : base(logger, "* * * * *",
    false)
  {
    this.mongo = mongo;
    this.notificationService = notificationService;
    this.rallyingPointService = rallyingPointService;
    this.userService = userService;
    this.postgisService = postgisService;
  }

  protected override Task DoWork(CancellationToken cancellationToken) => Update(DateTime.UtcNow, TimeSpan.FromMinutes(ReminderDelayInMinutes));

  public async Task Update(DateTime from, TimeSpan window)
  {
    var to = from.Add(window);
    await UpdateCanceledLianes(from, to);
    await UpdateActiveLianes(from, to);
    await UpdateFinishedLianes(from);
  }

  private async Task UpdateCanceledLianes(DateTime from, DateTime to)
  {
    var filter = Builders<LianeDb>.Filter.Where(l => l.State == LianeState.NotStarted && (l.Members.Count == 1 || !l.Driver.CanDrive))
                 & Builders<LianeDb>.Filter.ElemMatch(l => l.WayPoints, w => w.Eta > from && w.Eta <= to);
    var canceled = (await mongo.GetCollection<LianeDb>()
        .Find(filter)
        .Project(l => l.Id)
        .ToListAsync())
      .ToImmutableHashSet();

    await mongo.GetCollection<LianeDb>()
      .UpdateManyAsync(l => canceled.Contains(l.Id),
        Builders<LianeDb>.Update.Set(l => l.State, LianeState.Canceled));

    await postgisService.Clear(canceled.ToImmutableList());
  }

  private async Task UpdateFinishedLianes(DateTime from)
  {
    var limit = from.AddHours(-1);
    var filter = Builders<LianeDb>.Filter.Where(l => l.State == LianeState.NotStarted || l.State == LianeState.Started)
                 & Builders<LianeDb>.Filter.Where(l => l.Members.Count > 1 && l.Driver.CanDrive)
                 & Builders<LianeDb>.Filter.ElemMatch(l => l.WayPoints, w => w.Eta < limit);
    var lianes = await mongo.GetCollection<LianeDb>()
      .Find(filter)
      .ToListAsync();

    var finishedLianes = lianes
      .Where(l => l.WayPoints.Last().Eta < limit)
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

    await postgisService.Clear(finishedLianes.Select(l => l.Id).ToImmutableList());
  }

  private async Task UpdateActiveLianes(DateTime from, DateTime to)
  {
    var filter = Builders<LianeDb>.Filter.Where(l => l.State == LianeState.NotStarted || l.State == LianeState.Started)
                 & Builders<LianeDb>.Filter.Where(l => l.Members.Count > 1 && l.Driver.CanDrive)
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
      if (liane.State == LianeState.NotStarted && liane.DepartureTime < to)
      {
        lianeUpdates.Add(new UpdateOneModel<LianeDb>(
          Builders<LianeDb>.Filter.Eq(l => l.Id, liane.Id),
          Builders<LianeDb>.Update.Set(l => l.State, LianeState.Started)
        ));
      }
      
      for (var i = 0; i < liane.WayPoints.Count; i++)
      {
        var w = liane.WayPoints[i];
        if (w.Eta > to) break;
        else if (w.Eta > from)
        {
          var members = await GetRecipients(liane, w);
          if (members.IsEmpty)
          {
            continue;
          }
          var rallyingPoint = await w.RallyingPoint.Resolve(rallyingPointService.Get);
          var message = $"Vous avez rendez-vous à {w.Eta.ToString("H:mm", CultureInfo.InvariantCulture)} à \"{rallyingPoint.Label}\". Cliquez pour activer le suivi de votre position.";
          var nextWayPoints = await liane.WayPoints.Skip(i)
            .SelectAsync(async w => new WayPoint(await rallyingPointService.Get(w.RallyingPoint), w.Duration, w.Distance, w.Eta));
          
          foreach (var member in members)
          {
            reminders.Add( CreateReminder(from, $"Départ imminent", message, member, liane, nextWayPoints));
          }
         
        }
      }
      
    }

    await notificationService.SendReminders(from, reminders);

    if (lianeUpdates.Count > 0)
    {
      await mongo.GetCollection<LianeDb>()
        .BulkWriteAsync(lianeUpdates);
    }
  }

  private Notification.Reminder  CreateReminder(DateTime now, string title, string message, Ref<Api.User.User> to, LianeDb liane, ImmutableList<WayPoint> nextWayPoints) 
  {
    var lianeMember = liane.Members.First(m => m.User.Id == to.Id);
    var memberTrip = nextWayPoints
      .TakeUntilInclusive(w => w.RallyingPoint.Id == lianeMember.To.Id);

    return new Notification.Reminder(null, null, now, ImmutableList.Create(new Recipient(to)), ImmutableHashSet<Answer>.Empty, title, message, new Reminder(liane.Id, memberTrip.ToImmutableList(), liane.Driver.User.Id == to.Id));
  }
  /*
  private static Notification.Reminder CreateReminder(DateTime now, string title, string message, ImmutableList<Ref<Api.User.User>> to, Reminder reminder)
  {
    return new Notification.Reminder(null, null, now, to.Select(t => new Recipient(t)).ToImmutableList(), ImmutableHashSet<Answer>.Empty, title, message, reminder);
  }*/

  private async Task<ImmutableList<Ref<Api.User.User>>> GetRecipients(LianeDb liane, WayPointDb wayPoint)
  {
    var list = new List<Ref<Api.User.User>>();
    foreach (var r in liane.Members.Where(m => m.From.Id == wayPoint.RallyingPoint.Id)
               .Select(m => m.User))
    {
      var user = await userService.GetFullUser(r);
      if (user.LastName == "$")
      {
        continue;
      }

      list.Add(r);
    }

    return list.ToImmutableList();
  }
}