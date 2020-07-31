namespace Liane.Api.Address
{
    public sealed class AddressDetails
    {
        public AddressDetails(string? houseNumber, string? hamlet, string? road, string? isolatedDwelling, string? municipality, string? village, string? town, string? city, string? county,
            string? stateDistrict, string? state, string? postcode, string country, string countryCode)
        {
            HouseNumber = houseNumber;
            Hamlet = hamlet;
            Road = road;
            IsolatedDwelling = isolatedDwelling;
            Municipality = municipality;
            Village = village;
            Town = town;
            City = city;
            County = county;
            StateDistrict = stateDistrict;
            State = state;
            Postcode = postcode;
            Country = country;
            CountryCode = countryCode;
        }

        public string? HouseNumber { get; }
        public string? Hamlet { get; }
        public string? Road { get; }
        public string? IsolatedDwelling { get; }
        public string? Municipality { get; }
        public string? Village { get; }
        public string? Town { get; }
        public string? City { get; }
        public string? County { get; }
        public string? StateDistrict { get; }
        public string? State { get; }
        public string? Postcode { get; }
        public string Country { get; }
        public string CountryCode { get; }
    }
}