using System;
using System.Collections.Immutable;
using System.Reflection;
using Dapper;
using Liane.Api.Util;
using Liane.Service.Internal.Util.Sql;

namespace Liane.Service.Internal.Postgis.Db.Handler;

internal class SnakeCaseTypeMap : SqlMapper.ITypeMap
{
  private readonly ImmutableDictionary<string, SimpleMemberMap> memberMaps;
  private readonly ConstructorInfo constructorInfo;

  public SnakeCaseTypeMap(Type mappedType)
  {
    constructorInfo = mappedType.GetConstructors()[0];
    memberMaps = constructorInfo.GetParameters()
      .ToImmutableDictionary(p => Mapper.GetColumnName(p.Name!), p => new SimpleMemberMap(Mapper.GetColumnName(p.Name!), mappedType.GetProperty(p.Name!)!, p));
  }

  public ConstructorInfo FindConstructor(string[] names, Type[] types) => constructorInfo;

  public ConstructorInfo FindExplicitConstructor() => null!;

  public SqlMapper.IMemberMap GetConstructorParameter(ConstructorInfo constructor, string columnName) => memberMaps.GetValueOrDefault(columnName) ?? throw new ArgumentOutOfRangeException();

  public SqlMapper.IMemberMap GetMember(string columnName) => memberMaps.GetValueOrDefault(columnName) ?? throw new ArgumentOutOfRangeException();
}

internal sealed record SimpleMemberMap(string ColumnName, PropertyInfo Property, ParameterInfo Parameter) : SqlMapper.IMemberMap
{
  public Type MemberType => Parameter.ParameterType;
  public FieldInfo Field => null!;
}