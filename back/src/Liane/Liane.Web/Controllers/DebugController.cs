using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;

[Route("api/debug")]
[ApiController]
public sealed class DebugController : ControllerBase
{
  // private readonly IChatService chatService;
  // private readonly HubServiceImpl hubService;
  //
  // private static int inc = 0;
  //
  // public DebugController(IChatService chatService, HubServiceImpl hubService)
  // {
  //   this.chatService = chatService;
  //   this.hubService = hubService;
  // }
  //
  // [HttpGet("send")]
  // public async Task Send()
  // {
  //   var chloe = "63f745390f65806b1adb3018";
  //   var sent = await chatService.SaveMessageInGroup(new ChatMessage(ObjectId.GenerateNewId().ToString(), chloe, DateTime.Now, "Chep chèpe " + inc++), "64afb5710c5f07a6e647ed51", chloe);
  // }
  //
  // [HttpGet("notif")]
  // public async Task Notif()
  // {
  //   var augustin = "63f73936d3436d499d1075f6";
  //   var i = inc++;
  //   var sent = await hubService.SendNotification(augustin,
  //     new Notification.Reminder("test", "test", DateTime.UtcNow, ImmutableList.Create(new Recipient(augustin)), ImmutableHashSet<Answer>.Empty, "Bravo " + i, "Bravo2 " + i, null));
  // }

  // [HttpGet("test")]
  // public string Test([FromQuery] int nb)
  // {
  //   //throw new ArgumentException("Membre déjà actif");
  //   throw new ValidationException("Route", ValidationMessage.Required);
  // }
}