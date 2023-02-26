using System;
using System.Threading.Tasks;
using Liane.Api.Notification;
using Liane.Service.Internal.Mongo;
using Liane.Service.Internal.Mongo.Serialization;
using Liane.Service.Internal.Notification;
using MongoDB.Bson;
using MongoDB.Driver;
using NUnit.Framework;

namespace Liane.Test.ServiceLayerTest;

public sealed class BsonSerializationTest: BaseServiceLayerTest
{
  private IMongoDatabase db;

    [Test]
    public async Task ShouldFindNotification()
    {
      var id = ObjectId.GenerateNewId().ToString();
      NotificationDb n = new NotificationDb.WithEvent<string>(id, "ok", ObjectId.GenerateNewId().ToString() , DateTime.Now);
      await db.GetCollection<NotificationDb>().InsertOneAsync(n);
     
      var x = db.GetCollection<NotificationDb>().Find(e => e.Id == id).FirstOrDefault();
      Assert.NotNull(x);
    }
    
    private record Dummy(
      string message
    );
    
    [Test]
    public async Task ShouldFindNotificationStringOnly()
    {
      NotificationDb n1 = new NotificationDb.WithEvent<string>(ObjectId.GenerateNewId().ToString(), "ok", ObjectId.GenerateNewId().ToString() , DateTime.Now);
      await db.GetCollection<NotificationDb>().InsertOneAsync(n1);
     
      NotificationDb n2 = new NotificationDb.WithEvent<string>(ObjectId.GenerateNewId().ToString(), "hi", ObjectId.GenerateNewId().ToString() , DateTime.Now);
      await db.GetCollection<NotificationDb>().InsertOneAsync(n2);
      
      NotificationDb n3 = new NotificationDb.WithEvent<Dummy>(ObjectId.GenerateNewId().ToString(), new Dummy("hello"), ObjectId.GenerateNewId().ToString() , DateTime.Now);
      await db.GetCollection<NotificationDb>().InsertOneAsync(n3);

      const int expectedSize = 2;

      var x = db.GetCollection<NotificationDb>().Find(NotificationDiscriminatorConvention.GetDiscriminatorFilter<string>()).ToList();
      Assert.AreEqual(expectedSize, x.Count);

    }
    
    [Test]
    public async Task ShouldFindLianeEvent()
    {
      var id = ObjectId.GenerateNewId().ToString();
      var lianeEvent = new LianeEvent.NewMember(id, DateTime.Parse("2023-03-03"), ObjectId.GenerateNewId().ToString(), ObjectId.GenerateNewId().ToString());

      await db.GetCollection<LianeEvent>().InsertOneAsync(lianeEvent);
      var x = db.GetCollection<LianeEvent>().Find(e => e.Id == id).FirstOrDefault();
      Assert.NotNull(x);
    }

    protected override void InitService(IMongoDatabase db)
    {
      this.db = db;
    }
    
     
  }