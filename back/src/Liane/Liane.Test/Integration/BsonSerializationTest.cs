using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Event;
using Liane.Service.Internal.Mongo;
using MongoDB.Bson;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.Integration;

[TestFixture(Category = "Integration")]
public sealed class BsonSerializationTest : BaseIntegrationTest
{
  protected override void Setup(IMongoDatabase db)
  {
  }

  private static ImmutableList<Recipient> MakeRecipients()
  {
    return ImmutableList.Create(new Recipient(ObjectId.GenerateNewId().ToString(), null));
  }

  [Test]
  public async Task ShouldFindJoinLianeEvent()
  {
    var joinRequest = new LianeEvent.JoinRequest("6408a644437b60cfd3b15874", "Aurillac", "Medon", 2, false, "Hey !");
    var e1 = new Event(ObjectId.GenerateNewId().ToString(), MakeRecipients(), ObjectId.GenerateNewId().ToString(), DateTime.Parse("2023-03-03"), true,
      joinRequest);

    var e2 = new Event(ObjectId.GenerateNewId().ToString(), MakeRecipients(), ObjectId.GenerateNewId().ToString(), DateTime.Parse("2023-03-03"), false,
      new LianeEvent.NewMember("6408a644437b60cfd3b15874", "Aurillac", "Medon", 2, false));

    await Db.GetCollection<Event>().InsertOneAsync(e1);
    await Db.GetCollection<Event>().InsertOneAsync(e2);

    var filter = Builders<Event>.Filter.IsInstanceOf<Event, LianeEvent.JoinRequest>(e => e.LianeEvent);

    var x = await Db.GetCollection<Event>()
      .Find(filter)
      .ToListAsync();

    Assert.AreEqual(1, x.Count);
    Assert.AreEqual(joinRequest, x[0].LianeEvent);
  }

  [Test]
  public async Task ShouldFindLianeEvent()
  {
    var id = ObjectId.GenerateNewId().ToString();
    var join = new LianeEvent.JoinRequest("6408a644437b60cfd3b15874", "Aurillac", "Medon", 2, false, "Hey !");
    var e1 = new Event(id, MakeRecipients(), ObjectId.GenerateNewId().ToString(), DateTime.Parse("2023-03-03"), true, join);

    await Db.GetCollection<Event>()
      .InsertOneAsync(e1);

    var x = Db.GetCollection<Event>()
      .Find(e => e.Id == id)
      .FirstOrDefault();

    Assert.NotNull(x);
    Assert.AreEqual(join, x.LianeEvent);
  }
}