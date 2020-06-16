using System;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;

namespace Liane.Api.Util.File
{
    public sealed class HttpResponseFileStream : IFileStream
    {
        private readonly HttpResponseMessage response;

        public HttpResponseFileStream(HttpResponseMessage response)
        {
            this.response = response;
        }

        public string FileName => response.Content.Headers.ContentDisposition.FileName;
        public string ContentType => response.Content.Headers.ContentType.ToString();
        public long? ContentLength => response.Content.Headers.ContentLength;
        public string? ETag => response.Headers.ETag.ToString();
        public DateTimeOffset? LastModified => response.Content.Headers.LastModified;

        public Task<Stream> OpenStream()
        {
            return response.Content.ReadAsStreamAsync();
        }

        public async Task WriteToAsync(Stream stream)
        {
            await response.Content.CopyToAsync(stream);
        }
    }
}