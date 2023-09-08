using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace Liane.Api.Image;

public interface IImageService
{
  Task<string> UploadProfile(IFormFile input);
  Task DeleteProfile(string userId);
}