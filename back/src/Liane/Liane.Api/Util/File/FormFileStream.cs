using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace Liane.Api.Util.File;

public sealed class FormFileStream : IFileStream
{
    private readonly IFormFile formFile;

    public FormFileStream(IFormFile formFile)
    {
        this.formFile = formFile;
    }

    public string FileName => formFile.FileName;
    public string ContentType => formFile.ContentType;
    public long? ContentLength => formFile.Length;
    public string? ETag => null;
    public DateTimeOffset? LastModified => null;

    public Task<Stream> OpenStream()
    {
        return Task.FromResult(formFile.OpenReadStream());
    }

    public Task WriteToAsync(Stream stream)
    {
        return formFile.CopyToAsync(stream);
    }
}