using System;

namespace Liane.Service.Internal.Osrm
{
    public sealed class OsrmSettings
    {
        public OsrmSettings(Uri url)
        {
            Url = url;
        }

        public Uri Url { get; }
    }
}