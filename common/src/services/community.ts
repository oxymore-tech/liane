import {
  DayOfWeekFlag,
  Entity,
  Identity,
  Liane,
  PaginatedRequestParams,
  PaginatedResponse,
  RallyingPoint,
  Ref,
  User,
  UTCDateTime,
  WayPoint
} from "../api";
import { HttpClient } from "./http";
import { TimeOnly, TimeRange } from "./time";
import { BoundingBox } from "../util";

export type CoLianeRequest = Entity & {
  name: string;
  wayPoints: Ref<RallyingPoint>[];
  roundTrip: boolean;
  arriveBefore: TimeOnly;
  returnAfter: TimeOnly;
  canDrive: boolean;
  weekDays: DayOfWeekFlag;
  isEnabled: boolean;
};

export type ResolvedLianeRequest = Omit<CoLianeRequest, "wayPoints"> & { wayPoints: RallyingPoint[] };

export type CoLianeMatch = {
  lianeRequest: ResolvedLianeRequest;
  state: LianeState;
};

export type Detached = {
  type: "Detached";
  matches: CoMatch[];
};

export type Attached = {
  type: "Attached";
  liane: CoLiane;
};

export type LianeState = Detached | Attached;

export type Single = {
  type: "Single";
  name: string;
  members: User[];
  liane: Ref<CoLiane>;
  weekDays: DayOfWeekFlag;
  when: TimeRange;
  pickup: RallyingPoint;
  deposit: RallyingPoint;
  score: number;
  isReverseDirection?: boolean;
  joinRequest?: JoinRequest;
};

export type Group = {
  type: "Group";
  liane: Ref<CoLiane>;
  members: User[];
  matches: Ref<CoLianeRequest>[];
  weekDays: DayOfWeekFlag;
  when: TimeRange;
  pickup: RallyingPoint;
  deposit: RallyingPoint;
  score: number;
  isReverseDirection?: boolean;
  pendingRequest?: UTCDateTime;
};

export type JoinRequest = {
  type: "Pending" | "Received";
  at: UTCDateTime;
};

export type CoMatch = Single | Group;

export type CoLiane = Identity & {
  members: CoLianeMember[];
  pendingMembers: CoLianeMember[];
  wayPoints: RallyingPoint[];
  roundTrip: boolean;
  arriveBefore: TimeOnly;
  returnAfter: TimeOnly;
  weekDays: DayOfWeekFlag;
  createdAt: UTCDateTime;
  createdBy: User;
};

export type CoLianeMember = {
  user: User;
  lianeRequest: ResolvedLianeRequest;
  joinedAt: UTCDateTime;
  lastReadAt?: UTCDateTime;
};

export type JoinTripQuery = {
  liane: Ref<CoLiane>;
  trip: Ref<Liane>;
  takeReturnTrip: boolean;
};

export type LianeFilter = {
  forCurrentUser: boolean;
  bbox?: BoundingBox;
  weekDays?: DayOfWeekFlag;
};

export type Text = { type: "Text"; value: string };
export type LianeRequestModified = { type: "LianeRequestModified"; value: string; lianeRequest: Ref<CoLianeRequest> };
export type TripAdded = { type: "TripAdded"; value: string; trip: Ref<Liane> };
export type MemberRequested = { type: "MemberRequested"; value: string; user: Ref<User>; lianeRequest: Ref<CoLianeRequest> };
export type MemberAdded = { type: "MemberAdded"; value: string; user: Ref<User>; lianeRequest: Ref<CoLianeRequest> };
export type MemberRejected = { type: "MemberRejected"; value: string; user: Ref<User> };
export type MemberLeft = { type: "MemberLeft"; value: string; user: Ref<User> };
export type MemberJoinedTrip = { type: "MemberJoinedTrip"; value: string; user: Ref<User>; trip: Ref<Liane>; takeReturn: boolean };
export type MemberLeftTrip = { type: "MemberLeftTrip"; value: string; user: Ref<User>; trip: Ref<Liane> };
export type MemberHasStarted = { type: "MemberHasStarted"; value: string; user: Ref<User>; trip: Ref<Liane> };

export type MessageContent =
  | Text
  | LianeRequestModified
  | TripAdded
  | MemberRequested
  | MemberAdded
  | MemberRejected
  | MemberHasStarted
  | MemberLeft
  | MemberJoinedTrip
  | MemberLeftTrip;

export type LianeMessage<T extends MessageContent = MessageContent> = Entity & { content: T };

export interface CommunityService {
  match(): Promise<CoLianeMatch[]>;

  list(filter: LianeFilter): Promise<CoLiane[]>;

  get(liane: string): Promise<CoLiane>;

  getTrip(liane: string, lianeRequest?: string): Promise<WayPoint[]>;

  create(lianeRequest: CoLianeRequest): Promise<CoLianeRequest>;

  update(lianeRequestId: string, request: CoLianeRequest): Promise<CoLianeRequest>;

  delete(lianeRequestId: string): Promise<void>;

  joinRequest(mine: string, liane: string): Promise<CoLiane | undefined>;

  reject(lianeRequest: string, liane: string): Promise<CoLiane>;

  getIncomingTrips(liane: string): Promise<Liane[]>;

  joinTrip(query: JoinTripQuery): Promise<boolean>;

  leave(liane: string): Promise<boolean>;

  getMessages(liane: string, pagination?: PaginatedRequestParams): Promise<PaginatedResponse<LianeMessage>>;

  sendMessage(liane: string, content: MessageContent): Promise<LianeMessage>;

  getUnreadLianes(): Promise<Record<string, number>>;
}

export class CommunityServiceClient implements CommunityService {
  constructor(protected http: HttpClient) {}

  match() {
    return this.http.get<CoLianeMatch[]>("/community/match");
  }

  list(filter: LianeFilter) {
    return this.http.putAs<CoLiane[]>("/community/liane", { body: filter });
  }

  create(lianeRequest: CoLianeRequest) {
    return this.http.postAs<CoLianeRequest>("/community/liane", { body: lianeRequest });
  }

  async delete(lianeRequestId: string) {
    await this.http.del(`/community/liane/request/${lianeRequestId}`);
  }

  update(lianeRequestId: string, request: CoLianeRequest) {
    return this.http.postAs<CoLianeRequest>(`/community/liane/request/${lianeRequestId}`, { body: request });
  }

  joinRequest(mine: string, liane: string) {
    return this.http.postAs<CoLiane | undefined>(`/community/liane/${liane}/join/${mine}`);
  }

  reject(lianeRequest: string, liane: string) {
    return this.http.postAs<CoLiane>(`/community/liane/${liane}/reject/${lianeRequest}`);
  }

  getIncomingTrips(liane: string) {
    return this.http.get<Liane[]>(`/community/liane/${liane}/incoming_trip`);
  }

  getTrip(liane: string, lianeRequest?: string): Promise<WayPoint[]> {
    const suffix = lianeRequest ? `/${lianeRequest}` : "";
    return this.http.get<WayPoint[]>(`/community/liane/${liane}/trip${suffix}`);
  }

  joinTrip(query: JoinTripQuery) {
    return this.http.postAs<boolean>("/community/liane/join_trip", { body: query });
  }

  leave(liane: string) {
    return this.http.postAs<boolean>(`/community/liane/${liane}/leave`);
  }

  getMessages(liane: string, params?: PaginatedRequestParams) {
    return this.http.get<PaginatedResponse<LianeMessage>>(`/community/liane/${liane}/message`, { params });
  }

  sendMessage(liane: string, content: MessageContent) {
    return this.http.postAs<LianeMessage>(`/community/liane/${liane}/message`, { body: content });
  }

  getUnreadLianes() {
    return this.http.get<Record<string, number>>("/community/liane/unread");
  }

  get(liane: string) {
    return this.http.get<CoLiane>(`/community/liane/${liane}`);
  }
}
