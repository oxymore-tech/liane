import { Entity, LianeMember, Ref, User, UTCDateTime, WayPoint } from "@liane/common/src";
import { Identity, PaginatedRequestParams, RallyingPoint, RallyingPointRequest } from "@liane/common";

export type TripRecord = Entity &
  Readonly<{
    startedAt: UTCDateTime;
    finishedAt?: UTCDateTime;
    wayPoints: WayPoint[];
    members: LianeMember[];
    driver: { user: Ref<User>; canDrive: boolean };
  }>;

export type TripRecordFilterParams = PaginatedRequestParams &
  Readonly<{
    member?: string[];
    wayPoint?: string[];
    date?: UTCDateTime;
  }>;

export type RallyingPointStats = {
  totalTripCount: number;
  lastTripUsage?: UTCDateTime;
} & Identity;

export type RallyingPointFullRequest = {} & RallyingPointRequest;
