using Liane.Api.Routing;

namespace Liane.Api.Address
{
    public sealed class Address
    {
        public Address(string displayName, LatLng coordinate)
        {
            DisplayName = displayName;
            Coordinate = coordinate;
        }

        public string DisplayName { get; }
        public LatLng Coordinate { get; }
        
    }
}