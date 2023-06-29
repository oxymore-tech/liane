namespace Liane.Service.Internal.Postgis;

public sealed record DatabaseSettings(string Host, int Port, string Db, string Username, string Password);