using System.Text.Json;
using System.Text.RegularExpressions;

namespace Liane.Service.Internal.Util
{
    public sealed class SnakeCaseNamingPolicy : JsonNamingPolicy
    {
        public override string ConvertName(string name)
        {
            return ToSnakeCase(name);
        }

        public static string ToSnakeCase(string str)
        {
            Regex pattern = new(@"[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+");
            return string.Join("_", pattern.Matches(str)).ToLower();
        }
    }
}