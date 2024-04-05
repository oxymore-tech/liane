using System;
using Liane.Api.Util.Ref;

namespace Liane.Service.Internal.Trip;

public sealed record DetailedTripTrackReportDb(
  string Id,
  TripDb Trip,
  DateTime StartedAt,
  DateTime? FinishedAt
  ): IIdentity<string>;