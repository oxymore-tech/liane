using System;
using System.Collections.Immutable;
using System.Linq;
using Bogus;
using Liane.Api.Auth;
using Liane.Api.Trip;
using Liane.Service.Internal.User;
using MongoDB.Bson;

namespace Liane.Test.Integration;

public class Fakers
{
  private static Faker<DbUser> DbUserFaker => new Faker<DbUser>()
    .CustomInstantiator(f => new DbUser(
        ObjectId.GenerateNewId().ToString(), false, f.Phone.PhoneNumber("0#########"), null, null, null, DateTime.UtcNow.Date, null,
        new UserStats(), new UserInfo(f.Name.FirstName() + "-Bot", "$", null, Gender.Unspecified)
      )
    );

  public static readonly ImmutableList<DbUser> FakeDbUsers = DbUserFaker.Generate(8).ToImmutableList();

  public static readonly Faker<TripRequest> LianeRequestFaker = new Faker<TripRequest>()
    .CustomInstantiator(f =>
    {
      var rallyingPoints = f.PickRandom(LabeledPositions.RallyingPoints, 2).ToArray();
      return new TripRequest(null, null!, f.Date.Soon(15), null, 2, rallyingPoints[0], rallyingPoints[1]);
    });
}