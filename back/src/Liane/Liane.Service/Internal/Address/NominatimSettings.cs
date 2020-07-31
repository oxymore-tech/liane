using System;

namespace Liane.Service.Internal.Address
{
    public sealed class NominatimSettings
    {
        public NominatimSettings(Uri url)
        {
            Url = url;
        }

        public Uri Url { get; }
    }
}