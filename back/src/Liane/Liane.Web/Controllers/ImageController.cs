using System.Threading.Tasks;
using Liane.Api.Image;
using Liane.Web.Internal.Auth;
using Liane.Web.Internal.Debug;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Liane.Web.Controllers;

[Route("api/image")]
[ApiController]
[RequiresAuth]
public sealed class ImageController
{
  private readonly IImageService imageService;

  public ImageController(IImageService imageService)
  {
    this.imageService = imageService;
  }

  [HttpPost("profile")]
  public Task<string> UploadProfile([FromForm] IFormFile file)
  {
    return imageService.UploadProfile(file);
  }
}