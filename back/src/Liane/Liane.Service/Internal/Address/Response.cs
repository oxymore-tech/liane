namespace Liane.Service.Internal.Address;

public sealed record Response(
    string Lat,
    string Lon,
    string DisplayName,
    NominatimAddress Address
);