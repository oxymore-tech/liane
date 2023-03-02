using System;
using System.Collections.Immutable;
using System.Linq;
using System.Reflection;
using Liane.Service.Internal.Notification;
using MongoDB.Bson;
using MongoDB.Bson.IO;
using MongoDB.Bson.Serialization.Conventions;
using MongoDB.Driver;

namespace Liane.Service.Internal.Mongo.Serialization;

public sealed class NotificationDiscriminatorConvention : IDiscriminatorConvention
{

  /// <param name="includedEventTypes">If null, includes types from NotificationDb assembly + String for raw events</param>
  public NotificationDiscriminatorConvention(ImmutableList<Type>? includedEventTypes = null)
  {
    this.includedEventTypes = includedEventTypes ?? typeof(NotificationDb).Assembly.GetTypes()
      .Where(t => t.GetTypeInfo().IsClass)
      .Append(typeof(string)).ToImmutableList(); //TODO include API records
  }

  public static FilterDefinition<NotificationDb> GetDiscriminatorFilter<TEvent>() 
  {
    return new BsonDocument("_t", typeof(TEvent).Name);
  }
  public string ElementName => "_t";
  
  private readonly ImmutableList<Type> includedEventTypes;

  public Type GetActualType(IBsonReader bsonReader, Type nominalType)
  {
    if (!nominalType.IsAssignableTo(typeof(NotificationDb)))
      throw new Exception("Cannot use NotificationDiscriminator for type " + nominalType);

    var foundType = nominalType;

    var bookmark = bsonReader.GetBookmark();
    bsonReader.ReadStartDocument();
    if (bsonReader.FindElement(ElementName))
    {
      var value = bsonReader.ReadString();

      var eventType = includedEventTypes.FirstOrDefault(t => t.Name == value);

      if (eventType != null)
      {
        // Create generic type
        foundType = typeof(NotificationDb.WithEvent<>).MakeGenericType(eventType);
      }
    }

    bsonReader.ReturnToBookmark(bookmark);

    return foundType;
  }

  public BsonValue GetDiscriminator(Type nominalType, Type actualType)
  {
    if (nominalType != typeof(NotificationDb) && !actualType.IsSubclassOf(typeof(NotificationDb)))
      throw new Exception("Cannot use NotificationDiscriminator for type " + nominalType);

    // Find event type 
    if (!actualType.IsGenericType || actualType.GetGenericTypeDefinition() != typeof(NotificationDb.WithEvent<>)) throw new Exception();
    var eventType = actualType.GetGenericArguments()[0];
    return eventType.Name;
  }
}