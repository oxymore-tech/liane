using System.Text.Json.Serialization;

namespace Liane.Web.Hubs;

public record ChatUser(
    [property:JsonPropertyName("_id")]
    string Id,
    string Name
 );