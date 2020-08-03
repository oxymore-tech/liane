using Liane.Api.Routing;

namespace Liane.Api.Address
{
    public sealed class Address
    {
        public Address(string displayName, LatLng coordinate,string? icon, AddressDetails addressDetails)
        {
            DisplayName = displayName;
            Coordinate = coordinate;
            Icon = icon;
            AddressDetails = addressDetails;
        }

        public string DisplayName { get; }
        public LatLng Coordinate { get; }
        public string? Icon { get; }
        public AddressDetails AddressDetails { get; }
    }
}