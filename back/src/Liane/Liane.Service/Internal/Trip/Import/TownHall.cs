namespace Liane.Service.Internal.Trip.Import;

internal sealed record MairieEntry(string CodeInsee, string CodePostal, string NomOrganisme, string NomCommune, string Adresse, double? Latitude, double? Longitude);