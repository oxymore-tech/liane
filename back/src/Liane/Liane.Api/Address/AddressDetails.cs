namespace Liane.Api.Address
{
    public sealed class AddressDetails
    {
        public AddressDetails(string? house_number, string? hamlet, string? road, string? isolated_dwelling, string? municipality, string? village, string? town, string? city, string? county,
            string? state_district, string? state, string? postcode, string country, string countryCode)
        {
            HouseNumber = house_number;
            Hamlet = hamlet;
            Road = road;
            IsolatedDwelling = isolated_dwelling;
            Municipality = municipality;
            Village = village;
            Town = town;
            City = city;
            County = county;
            StateDistrict = state_district;
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