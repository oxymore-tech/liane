using System;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Notification;

public sealed record NotificationDb<T>(
  string? Id,
  T Event,
  Ref<Api.User.User> Receiver,
  DateTime CreatedAt
) : BaseNotificationDb(Id, Receiver, CreatedAt, nameof(T)) where T : class;


public abstract record BaseNotificationDb(
 // [property: BsonSerializer(typeof(String2ObjectIdBsonSerializer))]
  string? Id, 
  Ref<Api.User.User> Receiver,
  DateTime CreatedAt,
  //[property:BsonElement("_t")] 
  string Type
  ) : IIdentity;