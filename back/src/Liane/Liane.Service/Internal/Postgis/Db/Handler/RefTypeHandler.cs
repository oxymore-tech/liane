using System;
using System.Data;
using Dapper;
using GeoJSON.Net.Geometry;
using Liane.Api.Routing;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Postgis.Db.Handler;

internal sealed class RefTypeHandler<T> : SqlMapper.TypeHandler<Ref<T>> where T : class, IIdentity
{
  public override void SetValue(IDbDataParameter parameter, Ref<T>? value)
  {
    parameter.Value = value?.Id;
  }

  public override Ref<T> Parse(object value)
  {
    return (Ref<T>)value.ToString()!;
  }
}