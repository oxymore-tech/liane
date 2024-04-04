using System;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public record RallyingPointRequest(
  string? Id,
  RallyingPoint Point,
  string Comment,
  Ref<Auth.User>? CreatedBy,
  DateTime? CreatedAt,
  RallyingPointRequestStatus? Status = null
) : IEntity<string>;

[Union]
public abstract record RallyingPointRequestStatus
{
  public Ref<Auth.User> By { get; init; }

  private RallyingPointRequestStatus(Ref<Auth.User> by)
  {
    this.By = by;
  }

  public sealed record InReview(Ref<Auth.User> By) : RallyingPointRequestStatus(By);
  public sealed record Accepted(Ref<Auth.User> By) : RallyingPointRequestStatus(By);
  public sealed record Rejected(string Reason, Ref<Auth.User> By) : RallyingPointRequestStatus(By);
}
