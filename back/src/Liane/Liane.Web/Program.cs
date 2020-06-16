using Liane.Web.Extensions;

namespace Liane.Web
{
    public sealed class Program
    {
        public static void Main(string[] args)
        {
            ModuleExtensions.StartCurrentModule(args);
        }
    }
}