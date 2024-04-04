using System;
using Liane.Api.Chat;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Chat;

public sealed record DbChatMessage(
  string Id, 
  Ref<ConversationGroup> Group, 
  Ref<Api.Auth.User> CreatedBy, 
  DateTime CreatedAt, 
  string Text) : IIdentity<string>;