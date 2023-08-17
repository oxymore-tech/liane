using System;
using System.IO;
using System.Threading.Tasks;

namespace Liane.Web;

internal static class DotEnv
{
  public static async Task LoadLocal()
  {
    var root = Directory.GetCurrentDirectory();
    var dotenv = Path.Combine(root, "../../../.env.local");
    await Load(dotenv);
  }

  private static async Task Load(string filePath)
  {
    if (!File.Exists(filePath))
    {
      return;
    }

    foreach (var line in await File.ReadAllLinesAsync(filePath))
    {
      var parts = line.Split('=', StringSplitOptions.RemoveEmptyEntries);

      if (parts.Length != 2)
      {
        continue;
      }

      Environment.SetEnvironmentVariable(parts[0], parts[1]);
    }
  }
}