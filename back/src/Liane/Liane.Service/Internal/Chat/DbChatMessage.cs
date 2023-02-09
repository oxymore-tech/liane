using System;
using Liane.Api.Util.Ref;
using Liane.Service.Internal.Mongo.Serialization;
using MongoDB.Bson.Serialization.Attributes;

namespace Liane.Service.Internal.Chat;

public sealed record DbChatMessage(
  [property:BsonSerializer(typeof(String2ObjectIdBsonSerializer))]
  string Id, 
  string GroupId, 
  string CreatedBy, 
  DateTime CreatedAt, 
  string Text) : IIdentity;