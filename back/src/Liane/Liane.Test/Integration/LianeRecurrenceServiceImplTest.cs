using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Liane.Api.Trip;
using Liane.Api.Util;
using Liane.Api.Util.Pagination;
using Liane.Service.Internal.Chat;
using Liane.Service.Internal.Event;
using Liane.Service.Internal.Trip;
using Liane.Service.Internal.User;
using Liane.Web.Internal.Startup;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Bson;
using MongoDB.Driver;
using NUnit.Framework;
using DayOfWeek = System.DayOfWeek;

namespace Liane.Test.Integration;

[TestFixture(Category = "Integration")]
public sealed class LianeRecurrenceServiceImplTest : BaseIntegrationTest
{
  private LianeServiceImpl lianeService = null!;
  private MockCurrentContext currentContext = null!;
  private ILianeRecurrenceService recurrenceService = null!;

  protected override void Setup(IMongoDatabase db)
  {
    lianeService = ServiceProvider.GetRequiredService<LianeServiceImpl>();
    currentContext = ServiceProvider.GetRequiredService<MockCurrentContext>();
    recurrenceService = ServiceProvider.GetRequiredService<ILianeRecurrenceService>();
  }

  protected override void SetupServices(IServiceCollection services)
  {
    services.AddService(Moq.Mock.Of<IHubService>());
    services.AddService<UserServiceImpl>();
    services.AddService<ChatServiceImpl>();
    services.AddService<LianeServiceImpl>();
    services.AddService<FirebaseMessagingImpl>();
  }

    [Test]
  public async Task ShouldCreateRecurrentLiane()
  {
    var now = DateTime.UtcNow;
    var bertrand = Fakers.FakeDbUsers[2];
    var departureTime = now.AddHours(5);
    var expectedCount = departureTime.Day == now.Day ? 4 : 3;
    currentContext.SetCurrentUser(bertrand);
    var recurrence = DayOfTheWeekFlag.Create(new HashSet<DayOfWeek> { departureTime.DayOfWeek, departureTime.AddDays(5).DayOfWeek, departureTime.AddDays(4).DayOfWeek });
    var created = await lianeService.Create(
      new LianeRequest(ObjectId.GenerateNewId().ToString(), departureTime, departureTime.AddHours(3), 3, LabeledPositions.PointisInard, LabeledPositions.Tournefeuille, recurrence), bertrand.Id);
    Assert.NotNull(created.Recurrence);

    var lianes = await lianeService.List(new LianeFilter() { ForCurrentUser = true }, new Pagination());
    Assert.AreEqual(expectedCount * 2, lianes.Data.Count);

    var forthTrips = lianes.Data.Where(l => l.Return is not null).ToImmutableList();
    Assert.AreEqual(expectedCount, forthTrips.Count);
    Assert.True(forthTrips.All(l => l.Recurrence == created.Recurrence));
    Assert.True((await forthTrips.SelectAsync(async l =>
    {
      var returnTrip = await lianeService.Get(l.Return!);
      var t = returnTrip.DepartureTime - l.DepartureTime;
      return t == TimeSpan.FromHours(3);
    })).All(result => result));

    var dates = recurrence.GetNextActiveDates(departureTime, DateTime.UtcNow.AddDays(7)).Concat(new[] { departureTime }).Select(d => d.ToShortDateString() + d.ToShortTimeString()).ToList();
    var lianeDates = forthTrips.Select(l => l.DepartureTime.ToShortDateString() + l.DepartureTime.ToShortTimeString());
    CollectionAssert.AreEquivalent(dates, lianeDates);

  }

  [Test]
  public async Task ShouldRepeatRecurrentLiane()
  {
    var now = DateTime.UtcNow;
    var bertrand = Fakers.FakeDbUsers[2];
    var departureTime = now.AddHours(-2);

    currentContext.SetCurrentUser(bertrand);
    var recurrence = DayOfTheWeekFlag.Create(new HashSet<DayOfWeek> { departureTime.DayOfWeek, departureTime.AddDays(1).DayOfWeek, departureTime.AddDays(4).DayOfWeek });
    var created = await lianeService.Create(new LianeRequest(ObjectId.GenerateNewId().ToString(), departureTime, null, 3, LabeledPositions.PointisInard, LabeledPositions.Tournefeuille, recurrence),
      bertrand.Id);
    Assert.NotNull(created.Recurrence);

    var lianes = await lianeService.List(new LianeFilter() { ForCurrentUser = true }, new Pagination());

    Assert.AreEqual(3, lianes.Data.Count);

    // Delete last and test if it is recreated without duplication
    await lianeService.Delete(lianes.Data.Last().Id);
    await lianeService.CreateFromRecurrence(lianes.Data.First().Recurrence!.Id, bertrand.Id);

    var updatedLianes = await lianeService.List(new LianeFilter() { ForCurrentUser = true }, new Pagination());
    Assert.AreEqual(3, updatedLianes.Data.Count);
  }


  [Test]
  public async Task ShouldUpdateRecurrentTrips()
  {
    var now = DateTime.UtcNow;
    var bertrand = Fakers.FakeDbUsers[2];
    var departureTime = now.AddDays(3);
    currentContext.SetCurrentUser(bertrand);
    var recurrence = DayOfTheWeekFlag.Create(new HashSet<DayOfWeek> { now.AddDays(4).DayOfWeek, now.AddDays(5).DayOfWeek, now.DayOfWeek });
    var created = await lianeService.Create(new LianeRequest(ObjectId.GenerateNewId().ToString(), departureTime, null, 3, LabeledPositions.PointisInard, LabeledPositions.Tournefeuille, recurrence),
      bertrand.Id);

    // Deactivate recurrence while cleaning up old lianes
    await recurrenceService.Update(created.Recurrence!.Id, DayOfTheWeekFlag.Create(new HashSet<DayOfWeek>()));
    await lianeService.RemoveRecurrence(created.Recurrence!.Id);

    // Test recurrence is deactivated
    var lianes = await lianeService.List(new LianeFilter() { ForCurrentUser = true }, new Pagination());
    Assert.AreEqual(0, lianes.Data.Count);
    var dbRecurrence = await recurrenceService.Get(created.Recurrence!.Id);
    Assert.False(dbRecurrence.Active);
    Assert.AreEqual(dbRecurrence.Days, recurrence);


    // Update recurrence
    var newRecurrence = DayOfTheWeekFlag.Create(new HashSet<DayOfWeek> { now.AddDays(1).DayOfWeek });
    await recurrenceService.Update(created.Recurrence!.Id, newRecurrence);
    await lianeService.CreateFromRecurrence(created.Recurrence!.Id);
    // Test liane added correctly
    lianes = await lianeService.List(new LianeFilter() { ForCurrentUser = true }, new Pagination());
    Assert.AreEqual(1, lianes.Data.Count);
    dbRecurrence = await recurrenceService.Get(created.Recurrence!.Id);
    Assert.True(dbRecurrence.Active);
    Assert.AreEqual(dbRecurrence.Days, newRecurrence);
  }


  [Test]
  public async Task ShouldUpdateRecurrentTripsWithReturn()
  {
    var now = DateTime.Parse("2023-06-08T08:08:00Z");
    var bertrand = Fakers.FakeDbUsers[2];
    var departureTime = now.AddDays(3);
    currentContext.SetCurrentUser(bertrand);
    currentContext.SetAllowPastResourceCreation(true);
    var recurrence = DayOfTheWeekFlag.Create(new HashSet<DayOfWeek> { now.AddDays(4).DayOfWeek, now.AddDays(5).DayOfWeek, now.DayOfWeek });
    var created = await lianeService.Create(
      new LianeRequest(ObjectId.GenerateNewId().ToString(), departureTime, departureTime.AddHours(5), 3, LabeledPositions.PointisInard, LabeledPositions.Tournefeuille, recurrence), bertrand.Id);

    var lianes = await lianeService.List(new LianeFilter() { ForCurrentUser = true }, new Pagination());
    Assert.AreEqual(8, lianes.Data.Count);
    // Deactivate recurrence while cleaning up old lianes
    await recurrenceService.Update(created.Recurrence!.Id, DayOfTheWeekFlag.Create(new HashSet<DayOfWeek>()));
    await lianeService.RemoveRecurrence(created.Recurrence!.Id);

    // Test recurrence is deactivated
    lianes = await lianeService.List(new LianeFilter() { ForCurrentUser = true }, new Pagination());
    Assert.AreEqual(0, lianes.Data.Count);
    var dbRecurrence = await recurrenceService.Get(created.Recurrence!.Id);
    Assert.False(dbRecurrence.Active);
    Assert.AreEqual(dbRecurrence.Days, recurrence);


    // Update recurrence
    var newRecurrence = DayOfTheWeekFlag.Create(new HashSet<DayOfWeek> { now.AddDays(1).DayOfWeek });
    await recurrenceService.Update(created.Recurrence!.Id, newRecurrence);
    await lianeService.CreateFromRecurrence(created.Recurrence!.Id);
    // Test liane added correctly
    lianes = await lianeService.List(new LianeFilter() { ForCurrentUser = true }, new Pagination());
    Assert.AreEqual(2, lianes.Data.Count);
    Assert.True(lianes.Data.All(l => l.DepartureTime.DayOfWeek == now.AddDays(1).DayOfWeek));
    dbRecurrence = await recurrenceService.Get(created.Recurrence!.Id);
    Assert.True(dbRecurrence.Active);
    Assert.AreEqual(dbRecurrence.Days, newRecurrence);
  }
  

  [Test]
  public async Task ShouldRescheduleRecurrentLiane()
  {
    // Create recurrent trip with return
    var now = DateTime.UtcNow;
    var bertrand = Fakers.FakeDbUsers[2];
    var departureTime = now.AddHours(-2);
    var returnTime = departureTime.AddHours(4);

    currentContext.SetCurrentUser(bertrand);
    var recurrenceDays = new HashSet<DayOfWeek> { departureTime.DayOfWeek, departureTime.AddDays(1).DayOfWeek, departureTime.AddDays(4).DayOfWeek };
    var recurrence = DayOfTheWeekFlag.Create(recurrenceDays);
    var created = await lianeService.Create(new LianeRequest(ObjectId.GenerateNewId().ToString(), departureTime, returnTime, 3, LabeledPositions.PointisInard, LabeledPositions.Tournefeuille, recurrence),
      bertrand.Id);
    Assert.NotNull(created.Recurrence);

    var lianes = await lianeService.List(new LianeFilter() { ForCurrentUser = true }, new Pagination());

    Assert.AreEqual(6, lianes.Data.Count);

    // Incrementally generate trips in the future
    var expectedAddedCount = 0;
    for (int days = 1; days <= 7; days++)
    {
      var targetDay = DateTime.UtcNow.AddDays(days).DayOfWeek;
      var toUpdateEnumerable = await recurrenceService.GetUpdatableRecurrences(targetDay);
      var toUpdate = toUpdateEnumerable.ToImmutableList();
      if (!recurrenceDays.Contains(targetDay))
      {
        Assert.AreEqual(0, toUpdate.Count);
        continue;
      }
      else
      {
        expectedAddedCount += 2;
      }
    
      Assert.AreEqual(1, toUpdate.Count);
      await lianeService.CreateFromRecurrence(toUpdate[0], toUpdate[0].CreatedBy, 7+days);
      
      lianes = await lianeService.List(new LianeFilter() { ForCurrentUser = true }, new Pagination());

      Assert.AreEqual(6 + expectedAddedCount, lianes.Data.Count);
    }

    var trips = lianes.Data.Select(l =>
    new {
      DepartureTime = l.DepartureTime,
      WayPoints = l.WayPoints.Select(w => w.RallyingPoint.Id)
    }).ToImmutableList();
    
    // Check correctness
    Assert.AreEqual(trips.Count / 2, trips.Count(t => t.WayPoints.First() == LabeledPositions.PointisInard.Id));
    Assert.AreEqual(trips.Count / 2, trips.Count(t => t.WayPoints.First() == LabeledPositions.Tournefeuille.Id));
    Assert.True(trips.All(t => recurrenceDays.Contains(t.DepartureTime.DayOfWeek)));
    Assert.True(trips.All(t => t.DepartureTime.ToShortTimeString() == (t.WayPoints.First() == LabeledPositions.PointisInard.Id ? departureTime : returnTime).ToShortTimeString()));
  }
}