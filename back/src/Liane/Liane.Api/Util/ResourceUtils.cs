using System;
using System.IO;
using System.Reflection;
using System.Threading.Tasks;

namespace Liane.Api.Util
{
    public static class ResourceUtils
    {
        public static Stream? ReadResource(Assembly assembly, string resource)
        {
            if (resource.StartsWith("assembly:"))
            {
                var file = resource.Substring(9).Replace("/", ".");
                return assembly.GetManifestResourceStream($"{assembly.GetName().Name}.{file}");
            }

            var path = Path.GetFullPath(resource);
            return new FileStream(path, FileMode.Open, FileAccess.Read);
        }

        public static Task<byte[]> ReadResourceAsArrayAsync(Assembly assembly, string resource)
        {
            using var stream = ReadResource(assembly, resource);
            if (stream == null) throw new ArgumentException($"The file cannot be found : '{resource}'");

            return ReadResourceAsync(stream);
        }

        public static async Task<byte[]> ReadResourceAsync(Stream stream)
        {
            await using var memoryStream = new MemoryStream();
            await stream.CopyToAsync(memoryStream);
            return memoryStream.ToArray();
        }

        public static byte[] ReadResourceAsArray(Assembly assembly, string resource)
        {
            using var stream = ReadResource(assembly, resource);
            if (stream == null) throw new ArgumentException($"The file cannot be found : '{resource}'");

            return ReadResource(stream);
        }

        public static byte[] ReadResource(Stream stream)
        {
            using var memoryStream = new MemoryStream();
            stream.CopyTo(memoryStream);
            return memoryStream.ToArray();
        }
    }
}