using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Net.Http.Headers;

namespace Liane.Api.Util.File
{
    public sealed class FileStreamResult : FileResult
    {
        public FileStreamResult(IFileStream fileStream) : base(fileStream.ContentType)
        {
            FileDownloadName = fileStream.FileName;
            LastModified = fileStream.LastModified;
            EntityTag = fileStream.ETag.GetOrDefault(t => new EntityTagHeaderValue(t));
            FileStream = fileStream;
        }

        public IFileStream FileStream { get; }

        public override Task ExecuteResultAsync(ActionContext context)
        {
            var executor = context.HttpContext.RequestServices
                .GetRequiredService<IActionResultExecutor<FileStreamResult>>();
            return executor.ExecuteAsync(context, this);
        }
    }
}