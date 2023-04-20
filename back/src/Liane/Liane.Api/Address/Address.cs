namespace Liane.Api.Address;

public sealed record Address(
    string Street,
    string ZipCode,
    string City,
    string County,
    string State,
    string Country,
    string CountryCode
);