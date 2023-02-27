using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using Liane.Api.Notification;
using Liane.Api.Trip;
using Liane.Service.Internal.Chat;
using Liane.Service.Internal.Mongo.Serialization;
using Liane.Service.Internal.Notification;
using Liane.Service.Internal.Trip;
using Liane.Service.Internal.User;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Conventions;
using MongoDB.Driver;
using MongoDB.Driver.Core.Events;

namespace Liane.Service.Internal.Mongo;

public static class MongoFactory
{
  private static bool _init;

  public static IMongoDatabase Create(IServiceProvider sp)
  {
    var settings = sp.GetRequiredService<MongoSettings>();
    var logger = sp.GetRequiredService<ILogger<IMongoDatabase>>();
    return GetDatabase(settings, logger);
  }

  public static IMongoDatabase GetDatabase(MongoSettings settings, ILogger<IMongoDatabase> logger, string databaseName = "liane")
  {
    if (!_init)
    {
      var alwaysPack = new ConventionPack
      {
        new EnumRepresentationConvention(BsonType.String),
      };
      var stringIdAsObjectIdPack = new ConventionPack
      {
        new IdSerializationConvention(),
        new RefSerializationConvention(new[] { typeof(RallyingPoint) }.ToImmutableList())
      };

      ConventionRegistry.Register("EnumStringConvention", alwaysPack, _ => true);
      ConventionRegistry.Register("StringIdAsObjectId", stringIdAsObjectIdPack, t =>
      {
        var use = !t.IsAssignableFrom(typeof(RallyingPoint));
        return use;
      });
      //BsonSerializer.RegisterSerializer(new DateOnlyBsonSerializer());
      //BsonSerializer.RegisterSerializer(new TimeOnlyBsonSerializer());
      BsonSerializer.RegisterSerializer(new LatLngBsonSerializer());
      BsonSerializer.RegisterGenericSerializerDefinition(typeof(ImmutableList<>), typeof(ImmutableListSerializer<>));
      BsonSerializer.RegisterDiscriminatorConvention(typeof(NotificationDb), new NotificationDiscriminatorConvention());
      BsonSerializer.RegisterDiscriminatorConvention(typeof(LianeEvent), new PolymorphicTypeDiscriminatorConvention());
      _init = true;
    }

    var mongo = new MongoClient(new MongoClientSettings
    {
      Server = new MongoServerAddress(settings.Host, 27017),
      Credential = MongoCredential.CreateCredential("admin", settings.Username, settings.Password),
      ClusterConfigurator = cb => { cb.Subscribe<CommandStartedEvent>(e => { logger.LogDebug($"{e.CommandName} - {e.Command.ToJson()}"); }); }
    });

    var db = mongo.GetDatabase(databaseName);
    InitSchema(db);

    return db;
  }

  public static void InitSchema(IMongoDatabase db)
  {
    CreateIndex(db, "geometry_index", Builders<LianeDb>.IndexKeys.Geo2DSphere(l => l.Geometry));

    CreateIndex(db, "created_at_index", Builders<DbChatMessage>.IndexKeys.Descending(l => l.CreatedAt));

    db.GetCollection<DbUser>()
      .Indexes
      .CreateOne(new CreateIndexModel<DbUser>(Builders<DbUser>.IndexKeys.Ascending(l => l.Phone), new CreateIndexOptions { Name = "phone_index", Unique = true }));

    CreateIndex(db, "location_index", Builders<RallyingPoint>.IndexKeys.Geo2DSphere(l => l.Location));

    db.GetCollection<RallyingPoint>()
      .Indexes
      .CreateOne(new CreateIndexModel<RallyingPoint>(Builders<RallyingPoint>.IndexKeys.Combine(
        Builders<RallyingPoint>.IndexKeys.Text(m => m.Label),
        Builders<RallyingPoint>.IndexKeys.Text(m => m.City),
        Builders<RallyingPoint>.IndexKeys.Text(m => m.ZipCode),
        Builders<RallyingPoint>.IndexKeys.Text(m => m.Address)
      ), new CreateIndexOptions
      {
        Name = "text_index",
        Weights = new BsonDocument(new Dictionary<string, int>
        {
          { nameof(RallyingPoint.Label), 10 },
          { nameof(RallyingPoint.City), 5 },
          { nameof(RallyingPoint.ZipCode), 5 },
          { nameof(RallyingPoint.Address), 1 },
        })
      }));
  }

  private static void CreateIndex<T>(IMongoDatabase db, string name, IndexKeysDefinition<T> indexKey, CreateIndexOptions? options = null)
  {
    var indexOptions = options ?? new CreateIndexOptions { Name = name };
    db.GetCollection<T>().Indexes
      .CreateOne(new CreateIndexModel<T>(indexKey, indexOptions));
  }
}