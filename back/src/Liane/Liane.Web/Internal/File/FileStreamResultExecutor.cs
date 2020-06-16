using System;
using System.Threading.Tasks;
using Liane.Api.Util.File;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.Extensions.Logging;
using FileStreamResult = Liane.Api.Util.File.FileStreamResult;

namespace Liane.Web.Internal.File
{
    public sealed class FileStreamResultExecutor : FileResultExecutorBase, IActionResultExecutor<FileStreamResult>
    {
        public FileStreamResultExecutor(ILoggerFactory loggerFactory)
            : base(CreateLogger<FileStreamResultExecutor>(loggerFactory))
        {
        }

        /// <inheritdoc />
        public async Task ExecuteAsync(ActionContext context, FileStreamResult result)
        {
            if (context == null) throw new ArgumentNullException(nameof(context));

            if (result == null) throw new ArgumentNullException(nameof(result));

            var (_, _, serveBody) = SetHeadersAndLog(
                context,
                result,
                result.FileStream.ContentLength,
                false,
                result.LastModified,
                result.EntityTag);

            if (!serveBody) return;

            await WriteFileAsync(context, result);
        }

        private static Task WriteFileAsync(ActionContext context, FileStreamResult result)
        {
            if (context == null) throw new ArgumentNullException(nameof(context));

            if (result == null) throw new ArgumentNullException(nameof(result));

            return WriteFileAsync(context.HttpContext, result.FileStream);
        }

        private static async Task WriteFileAsync(HttpContext context, IFileStream fileStream)
        {
            var outputStream = context.Response.Body;
            try
            {
                await fileStream.WriteToAsync(outputStream);
            }
            catch (OperationCanceledException)
            {
                // Don't throw this exception, it's most likely caused by the client disconnecting.
                // However, if it was cancelled for any other reason we need to prevent empty responses.
                context.Abort();
            }
        }
    }
}