using Liane.Api.Object;
using Liane.Api.Util;

namespace Liane.Api.Response
{
    public class Response
    {
        // In case of an error the HTTP status code will be 400.
        // Otherwise the HTTP status code will be 200 and code will be Ok.
        public Code Code { get; }
        // Message is a optional human-readable error message.
        // All other status types are service dependent.
        public string ?Message { get; }
        public string ?Data_version { get; }
        
        public override string ToString()
        {
            return StringUtils.ToString(this);
        }

    }
}