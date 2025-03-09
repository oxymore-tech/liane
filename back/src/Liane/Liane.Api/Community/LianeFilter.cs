using Liane.Api.Trip;
using Liane.Api.Util.Geo;

namespace Liane.Api.Community;

public sealed record LianeFilter(BoundingBox Bbox, DayOfWeekFlag? WeekDays);