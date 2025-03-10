using System;
using System.Collections.Immutable;
using System.Linq;
using Bogus;
using Liane.Api.Auth;
using Liane.Api.Trip;
using Liane.Service.Internal.User;
using MongoDB.Bson;

namespace Liane.Test.Integration;

public static class Fakers
{
  private static ImmutableList<string> Names =
  [
    "gugu",
    "jayBee",
    "mathilde",
    "siloe",
    "gargamel",
    "caramelo",
    "bertrand",
    "samuel"
  ];

  private static Faker<DbUser> DbUserFaker => new Faker<DbUser>()
    .CustomInstantiator(f => new DbUser(
        ObjectId.GenerateNewId().ToString(), false, f.Phone.PhoneNumber("0#########"), null, null, null, DateTime.UtcNow.Date, null,
        new UserStats(), new UserInfo(f.Name.FirstName() + "-Bot", "$", null, Gender.Unspecified)
      )
    );

  public static readonly ImmutableList<DbUser> FakeDbUsers = Names.Select(n =>
  {
    var user = DbUserFaker.Generate();
    return user with { UserInfo = user.UserInfo! with { FirstName = n } };
  }).ToImmutableList();

  public static readonly Faker<TripRequest> LianeRequestFaker = new Faker<TripRequest>()
    .CustomInstantiator(f =>
    {
      var rallyingPoints = f.PickRandom(LabeledPositions.RallyingPoints, 2).ToArray();
      return new TripRequest(null, null!, f.Date.Soon(15), null, 2, rallyingPoints[0], rallyingPoints[1]);
    });

}