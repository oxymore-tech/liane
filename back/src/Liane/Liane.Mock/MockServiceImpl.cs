using System;
using System.Collections.Generic;
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

  /*** Public Fakers ***/
  // TODO use these in Tests ?
  public static Faker<DbUser> DbUserFaker => new Faker<DbUser>()
    .CustomInstantiator(f => new DbUser(
        ObjectId.GenerateNewId().ToString(),
        false,
        f.Phone.PhoneNumber("0#########"),
        "Bot " + f.Person.LastName,
        null, null, null, DateTime.Today, null
      )
    );

  private const int DefaultRadius = 40_000;

  public static Faker<LianeRequest> CreateLianeFaker(IEnumerable<RallyingPoint> departureSet, IEnumerable<RallyingPoint> destinationSet)
  {
    return new Faker<LianeRequest>()
      .CustomInstantiator(f =>
      {
        var driverCapacity = f.Random.Int(0, 3);
        var departure = f.Date.Soon(7).ToUniversalTime();
        DateTime? returnTrip = f.Random.Bool(0.2f) ? f.Date.SoonOffset(1, departure).DateTime.ToUniversalTime() : null;
        var from = f.PickRandom(departureSet);
        var to = f.PickRandom(destinationSet);

        return new LianeRequest(null, departure, returnTrip, driverCapacity, from, to);
      });
  }

  /*** Implementation ***/
  private async Task<User> GenerateUser()
  {
    var dbUser = DbUserFaker.Generate();
    await mongoDatabase.GetCollection<DbUser>().InsertOneAsync(dbUser);
    return await userService.Get(dbUser.Id);
  }

  public async Task<User> GenerateLiane(int count, LatLng pos, int? radius)
  {
    var user = await GenerateUser();

    // Fetch all rallying points in given radius
    radius ??= DefaultRadius;
    var rallyingPoints = await rallyingPointService.List(pos, null, radius, null);
    // Pick departure point in closest results and destination point amongst distant results
    var closest = rallyingPoints.GetRange(0, rallyingPoints.Count / 4).ToList();
    var farthest = rallyingPoints.GetRange(rallyingPoints.Count / 2, rallyingPoints.Count).ToList();
    var faker = CreateLianeFaker(closest, farthest);
    foreach (var lianeRequest in faker.Generate(count))
    {
      await lianeService.Create(lianeRequest, user.Id!);
    }

    return user;
  }
}