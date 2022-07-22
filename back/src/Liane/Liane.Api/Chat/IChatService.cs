using System.Net.WebSockets;
using System.Threading.Tasks;

namespace Liane.Api.Chat;

public interface IChatService
{
    Task Echo(WebSocket webSocket);
}