using System;
using System.Collections.Immutable;
using Liane.Api.Trip;
using Liane.Api.Auth;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Chat;
using Liane.Service.Internal.Mongo.Serialization;
using Liane.Service.Internal.User;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Conventions;
using MongoDB.Driver;
using MongoDB.Driver.Core.Events;
using MongoDB.Driver.Linq;

namespace Liane.Service.Internal.Mongo;

public static class MongoFactory
{
  private static bool _init;

  public static IMongoDatabase CreateForTest(IServiceProvider sp, MongoSettings settings, string databaseName)
  {
    var logger = sp.GetRequiredService<ILogger<IMongoDatabase>>();
    return GetDatabase(settings, null, logger, databaseName);
  }

  public static IMongoDatabase Create(IServiceProvider sp)
  {
    var settings = sp.GetRequiredService<MongoSettings>();
    var authSettings = sp.GetRequiredService<AuthSettings>();
    var logger = sp.GetRequiredService<ILogger<IMongoDatabase>>();
    return GetDatabase(settings, authSettings, logger);
  }

  private static IMongoDatabase GetDatabase(MongoSettings settings, AuthSettings? authSettings, ILogger<IMongoDatabase> logger, string databaseName = "liane")
  {
    var mongo = GetMongoClient(settings, logger);
    var db = mongo.GetDatabase(databaseName);
    InitSchema(db);

    if (authSettings?.TestAccount is not null)
    {
      var phone = authSettings.TestAccount.ToPhoneNumber().ToString();
      var testUser = db.GetCollection<DbUser>()
        .Find(u => u.Phone == phone)
        .FirstOrDefault();
      if (testUser is null)
      {
        db.GetCollection<DbUser>()
          .InsertOne(new DbUser
          (
            ObjectId.GenerateNewId().ToString(),
            true,
            phone,
            authSettings.TestCode,
            null, null, DateTime.UtcNow, null, new UserStats(), new UserInfo("Test account", "Test", null, Gender.Unspecified)
          ));
      }
    }

    return db;
  }

  public static MongoClient GetMongoClient(MongoSettings settings, ILogger<IMongoDatabase> logger)
  {
    if (!_init)
    {
      var alwaysPack = new ConventionPack
      {
        new EnumRepresentationConvention(BsonType.String),
        new CamelCaseElementNameConvention()
      };
      var stringIdAsObjectIdPack = new ConventionPack
      {
        new IdSerializationConvention()
      };

      ConventionRegistry.Register("EnumStringConvention", alwaysPack, _ => true);
      ConventionRegistry.Register("StringIdAsObjectId", stringIdAsObjectIdPack, t =>
      {
        var use = !t.IsAssignableFrom(typeof(RallyingPoint));
        return use;
      });
      BsonSerializer.RegisterSerializer(new DateOnlyBsonSerializer());
      BsonSerializer.RegisterSerializer(new DayOfWeekFlagSerializer());
      BsonSerializer.RegisterSerializer(new TimeOnlyBsonSerializer());
      BsonSerializer.RegisterSerializer(new LatLngBsonSerializer());
      BsonSerializer.RegisterGenericSerializerDefinition(typeof(Ref<>), typeof(RefBsonSerializer<>));
      BsonSerializer.RegisterGenericSerializerDefinition(typeof(ImmutableList<>), typeof(ImmutableListSerializer<>));
      BsonSerializer.RegisterGenericSerializerDefinition(typeof(ImmutableHashSet<>), typeof(ImmutableHashSetSerializer<>));
      UnionDiscriminatorConvention.Register();
      _init = true;
    }

    var mongo = new MongoClient(new MongoClientSettings
    {
      Server = new MongoServerAddress(settings.Host, 27017),
      Credential = MongoCredential.CreateCredential("admin", settings.Username, settings.Password),
      ClusterConfigurator = cb =>
      {
        cb.Subscribe<CommandStartedEvent>(e =>
        {
          var json = e.Command.ToJson();
          var command = json.Length < 50_000 ? json : "Big query not displayed";
          logger.LogDebug("{e.CommandName} - {command}", e.CommandName, command);
        });
      },
      LinqProvider = LinqProvider.V2
    });
    return mongo;
  }

  public static void InitSchema(IMongoDatabase db)
  {
    CreateIndex(db, "created_at_index", Builders<DbChatMessage>.IndexKeys.Descending(l => l.CreatedAt));

    db.GetCollection<DbUser>()
      .Indexes
      .CreateOne(new CreateIndexModel<DbUser>(Builders<DbUser>.IndexKeys.Ascending(l => l.Phone), new CreateIndexOptions { Name = "phone_index", Unique = true }));
  }

  private static void CreateIndex<T>(IMongoDatabase db, string name, IndexKeysDefinition<T> indexKey, CreateIndexOptions? options = null)
  {
    var indexOptions = options ?? new CreateIndexOptions { Name = name };
    db.GetCollection<T>().Indexes
      .CreateOne(new CreateIndexModel<T>(indexKey, indexOptions));
  }
}