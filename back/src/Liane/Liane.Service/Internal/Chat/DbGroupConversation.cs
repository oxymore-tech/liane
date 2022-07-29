using System.Collections.Generic;
using Liane.Web.Hubs;
using MongoDB.Bson.Serialization.Attributes;

namespace Liane.Service.Internal.Chat;

[BsonIgnoreExtraElements]
public record DbGroupConversation(
    string GroupId,
    List<ChatMessage> Messages
);