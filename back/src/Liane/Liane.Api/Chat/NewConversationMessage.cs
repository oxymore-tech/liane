using Liane.Api.Util.Ref;

namespace Liane.Api.Chat;

// TODO new message data, intended for notifications 
public sealed record NewConversationMessage(
  string ConversationId,
  ChatMessage Message
  );