using Liane.Api.Trip;
using Liane.Api.Util.Geo;

namespace Liane.Api.Community;

public sealed record LianeFilter(bool ForCurrentUser, BoundingBox? Bbox, DayOfWeekFlag? WeekDays);