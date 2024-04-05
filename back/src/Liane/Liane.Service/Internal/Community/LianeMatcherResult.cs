using System.Collections.Immutable;
using Liane.Api.Community;

namespace Liane.Service.Internal.Community;

public record LianeMatcherResult(
  ImmutableList<Match.Group> JoindedLianes,
  ImmutableList<Match> Matches)
{
  public static LianeMatcherResult Empty => new(ImmutableList<Match.Group>.Empty, ImmutableList<Match>.Empty);
}