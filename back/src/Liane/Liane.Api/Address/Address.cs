using Liane.Api.Routing;

namespace Liane.Api.Address
{
    public sealed class Address
    {
        public Address(string displayName, LatLng coordinate, AddressDetails addressDetails)
        {
            DisplayName = displayName;
            Coordinate = coordinate;
            AddressDetails = addressDetails;
        }

        public string DisplayName { get; }
        public LatLng Coordinate { get; }
        public AddressDetails AddressDetails { get; }
    }
}