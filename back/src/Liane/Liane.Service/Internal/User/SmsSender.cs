using System;
using brevo_csharp.Api;
using brevo_csharp.Client;
using brevo_csharp.Model;
using Microsoft.Extensions.Logging;
using Task = System.Threading.Tasks.Task;

namespace Liane.Service.Internal.User;

public sealed class SmsSender(ILogger<SmsSender> logger, SmsSettings smsSettings)
{
  private readonly TransactionalSMSApi api = new()
  {
    Configuration = new Configuration
    {
      ApiKey =
      {
        { "api-key", smsSettings.ApiKey }
      }
    }
  };

  public async Task Send(string phone, string message)
  {
    if (smsSettings.ApiKey is null)
    {
      logger.LogWarning("API key is missing, sms not sent to {0} with message {1}", phone, message);
      return;
    }

    var sendTransacSms = new SendTransacSms(
      "Liane",
      phone,
      message,
      SendTransacSms.TypeEnum.Transactional,
      "auth",
      "https://dev.liane.app"
    );

    try
    {
      var result = await api.SendTransacSmsAsync(sendTransacSms);
      logger.LogDebug("SMS sent to {0} with message {1} : {2}", phone, message, result);
    }
    catch (Exception e)
    {
      logger.LogError("Unable to send SMS to {0} with message {1} : {2}", phone, message, e);
    }
  }
}