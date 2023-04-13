using System.Threading.Tasks;

namespace Liane.Web;

public sealed class Program
{
    public static async Task Main(string[] args)
    {
        await Startup.StartCurrentModule(args);
    }
}