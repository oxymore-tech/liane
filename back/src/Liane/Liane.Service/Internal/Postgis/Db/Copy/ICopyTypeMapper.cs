namespace Liane.Service.Internal.Postgis.Db.Copy;

public interface ICopyTypeMapper
{
  string Export(string columnName);

  string Import(string columnName);
}