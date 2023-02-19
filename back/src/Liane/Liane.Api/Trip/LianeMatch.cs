using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public sealed record LianeMatch(Liane Liane, int DeltaInSeconds) : IIdentity
{
  public string Id => Liane.Id;
}