using System.Collections.Immutable;
using Liane.Api.Auth;
using Liane.Api.Trip;
using Liane.Api.Util.Ref;

namespace Liane.Api.Community;

public sealed record LianeMatch(
  LianeRequest LianeRequest,
  ImmutableList<Match.Group> JoindedLianes,
  ImmutableList<Match> Matches
);

[Union]
public abstract record Match
{
  private Match()
  {
  }

  public abstract string Name { get; init; }
  public abstract Ref<RallyingPoint> Pickup { get; init; }
  public abstract Ref<RallyingPoint> Deposit { get; init; }
  public abstract float Score { get; init; }

  public sealed record Single(
    string Name,
    Ref<LianeRequest> LianeRequest,
    Ref<User> User,
    Ref<RallyingPoint> Pickup,
    Ref<RallyingPoint> Deposit,
    float Score
  ) : Match;

  public sealed record Group(
    string Name,
    Liane Liane,
    ImmutableList<Single> Matches,
    Ref<RallyingPoint> Pickup,
    Ref<RallyingPoint> Deposit,
    float Score
  ) : Match;
}