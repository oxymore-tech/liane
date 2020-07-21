namespace Liane.Api.Address
{
    public sealed class AddressDetails
    {
        //"address":{
        //             "house_number":"135",
        //             "road":"Pilkington Avenue",
        //             "town":"Sutton Coldfield",
        //             "city":"Birmingham",
        //             "county":"West Midlands Combined Authority",
        //             "state_district":"West Midlands",
        //             "state":"England",
        //             "postcode":"B72 1LH",
        //             "country":"Royaume-Uni",
        //             "country_code":"gb"}

        public AddressDetails(string houseNumber, string road, string town, string city, string county, string stateDistrict, string state, string postcode, string country, string countryCode)
        {
            HouseNumber = houseNumber;
            Road = road;
            Town = town;
            City = city;
            County = county;
            StateDistrict = stateDistrict;
            State = state;
            Postcode = postcode;
            Country = country;
            CountryCode = countryCode;
        }

        public string HouseNumber { get; }
        public string Road { get; }
        public string Town { get; }
        public string City { get; }
        public string County { get; }
        public string StateDistrict { get; }
        public string State { get; }
        public string Postcode { get; }
        public string Country { get; }
        public string CountryCode { get; }
    }
}