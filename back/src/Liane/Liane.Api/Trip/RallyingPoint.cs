using System;
using Liane.Api.Routing;
using Liane.Api.Util.Ref;

namespace Liane.Api.Trip;

public sealed record RallyingPoint(
  string? Id,
  string Label,
  LatLng Location,
  LocationType Type,
  string Address,
  string ZipCode,
  string City,
  int? PlaceCount,
  bool IsActive = true
) : IIdentity<string>;

public enum LocationType
{
  Parking,
  CarpoolArea,
  Supermarket,
  HighwayExit,
  RelayParking,
  AbandonedRoad,
  AutoStop,
  TownHall,
  TrainStation,
  RoadSide
}

public sealed record RallyingPointStats(string Id, int TotalTripCount, DateTime? LastTripUsage) : IIdentity<string>;