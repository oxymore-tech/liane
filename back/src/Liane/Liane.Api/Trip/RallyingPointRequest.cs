using System;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public record RallyingPointRequest(
  string? Id,
  RallyingPoint Point,
  string Comment,
  Ref<User.User>? CreatedBy,
  DateTime? CreatedAt,
  RallyingPointRequestStatus? Status = null
) : IEntity<string>;

[Union]
public abstract record RallyingPointRequestStatus
{
  public Ref<User.User> By { get; init; }

  private RallyingPointRequestStatus(Ref<User.User> by)
  {
    this.By = by;
  }

  public sealed record InReview(Ref<User.User> By) : RallyingPointRequestStatus(By);
  public sealed record Accepted(Ref<User.User> By) : RallyingPointRequestStatus(By);
  public sealed record Rejected(string Reason, Ref<User.User> By) : RallyingPointRequestStatus(By);
}
