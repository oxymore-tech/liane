using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace Liane.Api.Image;

public interface IImageService
{
  Task UploadProfile(IFormFile input);
}