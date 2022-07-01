using System;
using System.IO;
using System.Threading.Tasks;

namespace Liane.Api.Util.File;

public sealed class RenamedFileStream : IFileStream
{
    private readonly IFileStream fileStream;

    public RenamedFileStream(IFileStream fileStream, string newFileName)
    {
        this.fileStream = fileStream;
        FileName = newFileName;
    }

    public string FileName { get; }

    public string ContentType => fileStream.ContentType;

    public long? ContentLength => fileStream.ContentLength;

    public string? ETag => fileStream.ETag;

    public DateTimeOffset? LastModified => fileStream.LastModified;

    public Task<Stream> OpenStream()
    {
        return fileStream.OpenStream();
    }

    public Task WriteToAsync(Stream stream)
    {
        return fileStream.WriteToAsync(stream);
    }
}