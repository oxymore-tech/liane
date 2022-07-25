using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace Liane.Api.Util.File;

public static class FileStreamExtensions
{
    public static async Task<HttpContent> ToStreamContent(this IFileStream fileStream)
    {
        var multipartFormDataContent = new MultipartFormDataContent();
        var fileStreamContent = new StreamContent(await fileStream.OpenStream());
        fileStreamContent.Headers.ContentDisposition = new ContentDispositionHeaderValue("form-data")
            {Name = "file", FileName = fileStream.FileName};
        fileStreamContent.Headers.ContentType = new MediaTypeHeaderValue(fileStream.ContentType);
        fileStreamContent.Headers.ContentLength = fileStream.ContentLength;
        multipartFormDataContent.Add(fileStreamContent);
        return multipartFormDataContent;
    }

    public static FormFileStream ToFileStream(this IFormFile formFile)
    {
        return new FormFileStream(formFile);
    }
}