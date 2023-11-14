using Liane.Api.Routing;

namespace Liane.Service.Internal.Postgis.Db.Copy;

public class LatLngCopyTypeMapper: ICopyTypeMapper
{
  public string Export(string columnName)
  {
    return $"st_y({columnName})||','||st_x({columnName})";
  }

  public string Import(string columnName)
  {
    return $"ST_SetSRID(ST_MakePoint(substring({columnName},position(',' in {columnName})+1)::float, substring({columnName},1, position(',' in {columnName})-1)::float),4326)";
  }
}