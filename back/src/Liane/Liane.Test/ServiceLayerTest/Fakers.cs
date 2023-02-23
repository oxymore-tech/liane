using System;
using System.Collections.Immutable;
using System.Linq;
using Bogus;
using Liane.Api.Chat;
using Liane.Api.Trip;
using Liane.Service.Internal.User;
using MongoDB.Bson;


namespace Liane.Test.ServiceLayerTest;

public class Fakers
{
  private static Faker<DbUser> DbUserFaker => new Faker<DbUser>()
    .CustomInstantiator(f => new DbUser(
        ObjectId.GenerateNewId().ToString(), false, f.Phone.PhoneNumber("0#########"), f.Name.FirstName(), null, null, null, DateTime.Today, null
      )
    );

  public static readonly ImmutableList<DbUser> FakeDbUsers = DbUserFaker.Generate(8).ToImmutableList();

  public static Faker<ConversationGroup> ConversationFaker => new Faker<ConversationGroup>()
    .CustomInstantiator(f =>
    {
      var memberUsers = f.PickRandom(FakeDbUsers, f.Random.Int(2, 3));
      var members = memberUsers.Select(m => new GroupMemberInfo(m.Id.ToString(), DateTime.Now, null));
      return new ConversationGroup(members.ToImmutableList(), ObjectId.GenerateNewId().ToString(), f.PickRandom(FakeDbUsers.ToList()).Id.ToString(), DateTime.Today);
    });

  public static readonly Faker<ChatMessage> MessageFaker = new Faker<ChatMessage>()
    .CustomInstantiator(f =>
      new ChatMessage(ObjectId.GenerateNewId().ToString(), f.PickRandom(FakeDbUsers.ToList()).Id.ToString(), DateTime.Now, f.Lorem.Sentence())
    );

  public static readonly Faker<LianeRequest> LianeRequestFaker = new Faker<LianeRequest>()
    .CustomInstantiator(f =>
    {
      var rallyingPoints = f.PickRandom(LabeledPositions.RallyingPoints, 2).ToArray();
      return new LianeRequest(null, f.Date.Soon(15), null, 2, rallyingPoints[0], rallyingPoints[1]);
    });
}