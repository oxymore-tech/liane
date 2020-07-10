using Liane.Api.Routing;

namespace Liane.Api.Address
{
    public sealed class AddressCoordQuery
    {
        public string Address { get; }

        public AddressCoordQuery(string address)
        {
            this.Address = address;
        }
    }

    public sealed class AddressNameQuery
    {
        public AddressNameQuery(LatLng coord)
        {
            this.Coord = coord;
        }

        public LatLng Coord { get; }
    }
}