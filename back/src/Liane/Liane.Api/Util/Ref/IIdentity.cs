namespace Liane.Api.Util.Ref;

public interface IIdentity
{
  object? Id { get; }
}

public interface IIdentity<out T> : IIdentity
{
  object? IIdentity.Id => Id;

  new T? Id { get; }
}