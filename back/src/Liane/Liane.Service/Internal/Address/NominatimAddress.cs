namespace Liane.Service.Internal.Address;

public sealed record NominatimAddress(
    string? HouseNumber,
    string? Hamlet,
    string? Road,
    string? IsolatedDwelling,
    string? Municipality,
    string? Village,
    string? Town,
    string? City,
    string? County,
    string? StateDistrict,
    string? State,
    string? Postcode,
    string Country,
    string CountryCode
);