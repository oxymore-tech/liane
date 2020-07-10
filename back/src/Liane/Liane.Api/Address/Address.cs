using Liane.Api.Routing;

namespace Liane.Api.Address
{
    public sealed class Address
    {
        public Address(string address, LatLng coord)
        {
            this.address = address;
            this.coord = coord;
        }

        public string address { get; }
        public LatLng coord { get; }
        
    }
}