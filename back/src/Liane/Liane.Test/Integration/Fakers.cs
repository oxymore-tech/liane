using System;
using System.Collections.Immutable;
using System.Linq;
using Bogus;
using Liane.Api.Chat;
using Liane.Api.Trip;
using Liane.Service.Internal.User;
using MongoDB.Bson;

namespace Liane.Test.Integration;

public class Fakers
{
  public static Faker<DbUser> DbUser => new Faker<DbUser>()
    .CustomInstantiator(f => new DbUser(
        ObjectId.GenerateNewId().ToString(), false, f.Phone.PhoneNumber("0#########"), f.Name.FirstName(), null, null, null, DateTime.Today, null
      )
    );

  public static readonly ImmutableList<DbUser> DbUsers = DbUser.Generate(8).ToImmutableList();

  public static Faker<ConversationGroup> ConversationFaker => new Faker<ConversationGroup>()
    .CustomInstantiator(f =>
    {
      var memberUsers = f.PickRandom(DbUsers, f.Random.Int(2, 3));
      var members = memberUsers.Select(m => new GroupMemberInfo(m.Id.ToString(), DateTime.Now, null));
      return new ConversationGroup(members.ToImmutableList(), ObjectId.GenerateNewId().ToString(), f.PickRandom(DbUsers.ToList()).Id.ToString(), DateTime.Today);
    });

  public static readonly Faker<ChatMessage> Message = new Faker<ChatMessage>()
    .CustomInstantiator(f =>
      new ChatMessage(ObjectId.GenerateNewId().ToString(), f.PickRandom(DbUsers.ToList()).Id.ToString(), DateTime.Now, f.Lorem.Sentence())
    );

  public static readonly Faker<LianeRequest> LianeRequest = new Faker<LianeRequest>()
    .CustomInstantiator(f =>
    {
      var rallyingPoints = f.PickRandom(LabeledPositions.RallyingPoints, 2).ToArray();
      return new LianeRequest(null, f.Date.Soon(15), null, 2, rallyingPoints[0], rallyingPoints[1]);
    });
}