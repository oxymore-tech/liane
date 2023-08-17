using System.Threading.Tasks;

namespace Liane.Web;

public sealed class Program
{
  public static async Task Main(string[] args)
  {
    await DotEnv.LoadLocal();
    await Startup.StartCurrentModule(args);
  }
}