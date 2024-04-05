import { Entity, TripMember, Ref, User, UTCDateTime, WayPoint } from "@liane/common/src";
import { PaginatedRequestParams } from "@liane/common";

export type TripRecord = Entity &
  Readonly<{
    startedAt: UTCDateTime;
    finishedAt?: UTCDateTime;
    wayPoints: WayPoint[];
    members: TripMember[];
    driver: { user: Ref<User>; canDrive: boolean };
  }>;

export type TripRecordFilterParams = PaginatedRequestParams &
  Readonly<{
    member?: string[];
    wayPoint?: string[];
    date?: UTCDateTime;
  }>;
