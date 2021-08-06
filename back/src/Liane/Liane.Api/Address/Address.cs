namespace Liane.Api.Address
{
    public sealed record Address(
        string Street,
        string ZipCode,
        string City,
        string Country,
        string CountryCode
    );
}