using System.Threading.Tasks;
using Liane.Api.Metrics;
using Liane.Web.Internal.Auth;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;

[Route("api/metrics")]
[ApiController]
[RequiresAdminAuth]
public sealed class MetricsController(IUsageService usageService)
  : ControllerBase
{
  [HttpGet]
  public Task<UsageSnapshot> Usage()
  {
    return usageService.GetUsage();
  }
}