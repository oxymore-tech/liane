using System.Text.Json.Serialization;
using Newtonsoft.Json;

namespace Liane.Web.Hubs;

public record ChatMessage(
    [property:JsonPropertyName("_id")]
    string Id,
    string Text,
    string CreatedAt,
    ChatUser User
);