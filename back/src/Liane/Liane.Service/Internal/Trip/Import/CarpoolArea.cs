namespace Liane.Service.Internal.Trip.Import;

internal sealed record BnlcEntry(string IdLieu, string NomLieu, string AdLieu, string ComLieu, string Type, string Insee, double XLong, double YLat, int? NbrePl, int? NbrePmr);