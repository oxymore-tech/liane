using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Bogus;
using Liane.Api.Auth;
using Liane.Api.Routing;
using Liane.Api.Trip;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.User;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Liane.Mock;

public sealed class MockServiceImpl(ITripService tripService, IUserService userService, IMongoDatabase mongoDatabase, IRallyingPointService rallyingPointService)
  : IMockService
{
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

  private static Faker<TripRequest> CreateLianeFaker(IEnumerable<RallyingPoint> departureSet, IEnumerable<RallyingPoint> destinationSet, DateTime startDay)
  {
    return new Faker<TripRequest>()
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

        return new TripRequest(departure, returnTrip, seatCount, from, to);
      });
  }

  private async Task<User> GenerateUser()
  {
    var dbUser = DbUserFaker.Generate();
    await mongoDatabase.GetCollection<DbUser>().InsertOneAsync(dbUser);
    return await userService.Get(dbUser.Id);
  }

  public async Task<ImmutableList<Trip>> GenerateTrips(int count, LatLng from, LatLng? to, int? radius)
  {
    var user = await GenerateUser();

    var (departureSet, arrivalSet) = await GetRallyingPoints(from, to, radius);

    if (departureSet.IsEmpty || arrivalSet.IsEmpty)
    {
      throw new ArgumentException($"Not enough rallying points found ({from.Lat}, {from.Lng}) to generates trips");
    }

    var trips = new List<Trip>();

    var numberOfDays = 2;
    var eachDay = (int)Math.Ceiling((double)count / numberOfDays);
    for (var i = 0; i < numberOfDays; i++)
    {
      var day = DateTime.Today.AddDays(i + 1);
      var inOneWay = eachDay / 2;
      trips.AddRange(await GenerateFakeTripsInOneWay(departureSet, arrivalSet, inOneWay, user, day));
      trips.AddRange(await GenerateFakeTripsInOneWay(arrivalSet, departureSet, inOneWay, user, day));
    }

    return trips.ToImmutableList();
  }

  private async Task<List<Trip>> GenerateFakeTripsInOneWay(ImmutableList<RallyingPoint> departureSet, ImmutableList<RallyingPoint> arrivalSet, int count, User user, DateTime day)
  {
    var trips = new List<Trip>();

    var faker = CreateLianeFaker(departureSet, arrivalSet, day);
    foreach (var lianeRequest in faker.Generate(count))
    {
      var liane = await tripService.Create(lianeRequest, user.Id!);
      trips.Add(liane);
    }

    return trips;
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
    }
    else
    {
      var departureSet = await rallyingPointService.List(RallyingPointFilter.Create(from, radius, limit: 50));
      var arrivalSet = await rallyingPointService.List(RallyingPointFilter.Create(to.Value, radius, limit: 50));
      return (departureSet.Data, arrivalSet.Data);
    }
  }
}