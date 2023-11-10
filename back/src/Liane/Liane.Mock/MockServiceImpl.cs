using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Bogus;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Api.User;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.User;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Mock;

public sealed class MockServiceImpl : IMockService
{
  private readonly ILianeService lianeService;
  private readonly IUserService userService;
  private readonly IRallyingPointService rallyingPointService;
  private readonly IMongoDatabase mongoDatabase;

  public MockServiceImpl(ILianeService lianeService, IUserService userService, IMongoDatabase mongoDatabase, IRallyingPointService rallyingPointService)
  {
    this.lianeService = lianeService;
    this.userService = userService;
    this.mongoDatabase = mongoDatabase;
    this.rallyingPointService = rallyingPointService;
  }

  private static Faker<DbUser> DbUserFaker => new Faker<DbUser>()
    .CustomInstantiator(f => new DbUser(
        ObjectId.GenerateNewId().ToString()!,
        false,
        f.Phone.PhoneNumber("0#########"),
        null, null, null, DateTime.UtcNow, null, new UserStats(),
        new UserInfo(f.Name.FirstName() + "-Bot", "$", null, Gender.Unspecified)
      )
    );

  private const int DefaultRadius = 5_000;

  private static Faker<LianeRequest> CreateLianeFaker(IEnumerable<RallyingPoint> departureSet, IEnumerable<RallyingPoint> destinationSet, DateTime startDay)
  {
    return new Faker<LianeRequest>()
      .CustomInstantiator(f =>
      {
        // Get a random number of offered (driver search) or required (passenger) seats
        var seatCount = f.Random.Int(1, 3) * f.Random.ArrayElement(new[] { 1, -1 });
        var start = startDay.Date.AddHours(9);
        var end = startDay.Date.AddHours(18);
        var departure = f.Date.Between(start, end).ToUniversalTime();
        DateTime? returnTrip = f.Random.Bool(0.5f) ? f.Date.SoonOffset(1, departure).DateTime.ToUniversalTime() : null;
        var from = f.PickRandom(departureSet);
        var to = f.PickRandom(destinationSet.Where(d => d != from));

        return new LianeRequest(null, departure, returnTrip, seatCount, from, to);
      });
  }

  private async Task<User> GenerateUser()
  {
    var dbUser = DbUserFaker.Generate();
    await mongoDatabase.GetCollection<DbUser>().InsertOneAsync(dbUser);
    return await userService.Get(dbUser.Id);
  }

  public async Task<ImmutableList<Api.Trip.Liane>> GenerateLianes(int count, LatLng from, LatLng? to, int? radius)
  {
    var user = await GenerateUser();

    var (departureSet, arrivalSet) = await GetRallyingPoints(from, to, radius);

    if (departureSet.IsEmpty || arrivalSet.IsEmpty)
    {
      throw new ArgumentException($"Not enough rallying points found ({from.Lat}, {from.Lng}) to generates lianes");
    }

    var lianes = new List<Api.Trip.Liane>();

    var numberOfDays = 2;
    var eachDay = (int)Math.Ceiling((double)count / numberOfDays);
    for (var i = 0; i < numberOfDays; i++)
    {
      var day = DateTime.Today.AddDays(i + 1);
      var inOneWay = eachDay / 2;
      lianes.AddRange(await GenerateFakeLianesInOneWay(departureSet, arrivalSet, inOneWay, user, day));
      lianes.AddRange(await GenerateFakeLianesInOneWay(arrivalSet, departureSet, inOneWay, user, day));
    }

    return lianes.ToImmutableList();
  }

  private async Task<List<Api.Trip.Liane>> GenerateFakeLianesInOneWay(ImmutableList<RallyingPoint> departureSet, ImmutableList<RallyingPoint> arrivalSet, int count, User user, DateTime day)
  {
    var lianes = new List<Api.Trip.Liane>();

    var faker = CreateLianeFaker(departureSet, arrivalSet, day);
    foreach (var lianeRequest in faker.Generate(count))
    {
      var liane = await lianeService.Create(lianeRequest, user.Id!);
      lianes.Add(liane);
    }

    return lianes;
  }

  private async Task<(ImmutableList<RallyingPoint>, ImmutableList<RallyingPoint>)> GetRallyingPoints(LatLng from, LatLng? to, int? radius)
  {
    radius ??= DefaultRadius;
    if (to is null)
    {
      var rallyingPoints = await rallyingPointService.List(RallyingPointFilter.Create(from, radius, limit: 50));
      var half = rallyingPoints.Data.Count / 2;
      var departureSet = rallyingPoints.Data.Take(half).ToImmutableList();
      var arrivalSet = rallyingPoints.Data.Skip(half).Take(half).ToImmutableList();

      return (departureSet, arrivalSet);
    } else {
      var departureSet = await rallyingPointService.List(RallyingPointFilter.Create(from, radius, limit: 50));
      var arrivalSet = await rallyingPointService.List(RallyingPointFilter.Create(to.Value, radius, limit: 50));
      return (departureSet.Data, arrivalSet.Data);
    }
  }
}