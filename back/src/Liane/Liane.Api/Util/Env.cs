using System;

namespace Liane.Api.Util
{
    public static class Env
    {
        public static bool IsDevelopment()
        {
            return Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development";
        }
    }
}