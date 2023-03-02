using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Liane.Api.Notification;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Mongo.Serialization;
using Liane.Service.Internal.Notification;
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
  
  private static ImmutableList<Receiver> MakeReceivers()
  {
    return new[]
    {
      new Receiver(ObjectId.GenerateNewId().ToString())
    }.ToImmutableList();
  }
  
  [Test]
  public async Task ShouldFindNotification()
  {
    var id = ObjectId.GenerateNewId().ToString();
    NotificationDb n = new NotificationDb.WithEvent<string>(id, "ok", MakeReceivers(), DateTime.Now);
    await Db.GetCollection<NotificationDb>().InsertOneAsync(n);

    var x = Db.GetCollection<NotificationDb>().Find(e => e.Id == id).FirstOrDefault();
    Assert.NotNull(x);
  }

  private record Dummy(
    string message
  );

  [Test]
  public async Task ShouldFindNotificationStringOnly()
  {
    NotificationDb n1 = new NotificationDb.WithEvent<string>(ObjectId.GenerateNewId().ToString(), "ok", MakeReceivers(), DateTime.Now);
    await Db.GetCollection<NotificationDb>().InsertOneAsync(n1);

    NotificationDb n2 = new NotificationDb.WithEvent<string>(ObjectId.GenerateNewId().ToString(), "hi", MakeReceivers(), DateTime.Now);
    await Db.GetCollection<NotificationDb>().InsertOneAsync(n2);

    NotificationDb n3 = new NotificationDb.WithEvent<Dummy>(ObjectId.GenerateNewId().ToString(), new Dummy("hello"), MakeReceivers(), DateTime.Now);
    await Db.GetCollection<NotificationDb>().InsertOneAsync(n3);

    const int expectedSize = 2;

    var x = Db.GetCollection<NotificationDb>().Find(NotificationDiscriminatorConvention.GetDiscriminatorFilter<string>()).ToList();
    Assert.AreEqual(expectedSize, x.Count);
  }

  [Test]
  public async Task ShouldFindLianeEvent()
  {
    var id = ObjectId.GenerateNewId().ToString();
    var lianeEvent = new LianeEvent.NewMember(id, DateTime.Parse("2023-03-03"), ObjectId.GenerateNewId().ToString(), ObjectId.GenerateNewId().ToString());

    await Db.GetCollection<LianeEvent>().InsertOneAsync(lianeEvent);
    var x = Db.GetCollection<LianeEvent>().Find(e => e.Id == id).FirstOrDefault();
    Assert.NotNull(x);
  }

}