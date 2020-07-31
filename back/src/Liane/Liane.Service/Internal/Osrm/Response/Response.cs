using Liane.Api.Util;

namespace Liane.Service.Internal.Osrm.Response
{
    public class Response
    {
        public Response(Code code, string? message, string? dataVersion)
        {
            Code = code;
            Message = message;
            DataVersion = dataVersion;
        }

        // In case of an error the HTTP status code will be 400.
        // Otherwise the HTTP status code will be 200 and code will be Ok.
        public Code Code { get; }

        // Message is a optional human-readable error message.
        // All other status types are service dependent.
        public string? Message { get; }
        public string? DataVersion { get; }

        public override string ToString()
        {
            return StringUtils.ToString(this);
        }
    }
}