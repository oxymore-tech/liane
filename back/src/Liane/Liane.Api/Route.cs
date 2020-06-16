using Liane.Api.Util;

namespace Liane.Api
{
    public sealed class Route
    {
        public Route(string code)
        {
            Code = code;
        }

        public string Code { get; }

        public override string ToString()
        {
            return StringUtils.ToString(this);
        }
    }
}