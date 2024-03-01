using System;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Trip;

public sealed record DetailedLianeTrackReportDb(
  string Id,
  LianeDb Liane,
  DateTime StartedAt,
  DateTime? FinishedAt
  ): IIdentity<string>;