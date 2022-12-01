using System;
using MongoDB.Bson;

namespace Liane.Service.Internal.Chat;

public sealed record DbChatMessage(ObjectId Id, string GroupId, string CreatedBy, DateTime CreatedAt, string Text);