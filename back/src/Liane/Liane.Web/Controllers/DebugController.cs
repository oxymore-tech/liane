using System;
using System.Threading.Tasks;
using Liane.Api.Chat;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;

namespace Liane.Web.Controllers;

[Route("api/debug")]
[ApiController]
public sealed class DebugController : ControllerBase
{
  private readonly IChatService chatService;

  private static int inc = 0;

  public DebugController(IChatService chatService)
  {
    this.chatService = chatService;
  }

  [HttpGet("send")]
  public async Task Send()
  {
    var chloe = "63f745390f65806b1adb3018";
    var sent = await chatService.SaveMessageInGroup(new ChatMessage(ObjectId.GenerateNewId().ToString(), chloe, DateTime.Now, "Chep chèpe " + inc++), "64afb7250c5f07a6e647ed57", chloe);
  }
}