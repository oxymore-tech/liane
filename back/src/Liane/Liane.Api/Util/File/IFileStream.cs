using System;
using System.IO;
using System.Threading.Tasks;

namespace Liane.Api.Util.File;

public interface IFileStream
{
    string FileName { get; }
    string ContentType { get; }
    long? ContentLength { get; }
    string? ETag { get; }
    DateTimeOffset? LastModified { get; }
    Task<Stream> OpenStream();
    Task WriteToAsync(Stream stream);

    IFileStream Rename(string newFileName)
    {
        return new RenamedFileStream(this, newFileName);
    }
}