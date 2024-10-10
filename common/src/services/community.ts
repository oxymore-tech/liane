import { DayOfWeekFlag, Entity, Identity, Liane, PaginatedRequestParams, PaginatedResponse, RallyingPoint, Ref, User, UTCDateTime } from "../api";
import { HttpClient } from "./http";
import { TimeOnly, TimeRange } from "./time";

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

export type Pending = {
  type: "Pending";
  liane: CoLiane;
};

export type Attached = {
  type: "Attached";
  liane: CoLiane;
};

export type LianeState = Detached | Pending | Attached;

export type Single = {
  type: "Single";
  liane: Ref<CoLiane>;
  weekDays: DayOfWeekFlag;
  when: TimeRange;
  pickup: RallyingPoint;
  deposit: RallyingPoint;
  score: number;
  isReverseDirection?: boolean;
  askToJoinAt?: UTCDateTime;
};

export type Group = {
  type: "Group";
  liane: Ref<CoLiane>;
  totalMembers: number;
  matches: Ref<CoLianeRequest>[];
  weekDays: DayOfWeekFlag;
  when: TimeRange;
  pickup: RallyingPoint;
  deposit: RallyingPoint;
  score: number;
  isReverseDirection?: boolean;
};

export type CoMatch = Single | Group;

export type CoLiane = Identity & {
  members: CoLianeMember[];
  pendingMembers: CoLianeMember[];
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

export type TextMessage = { type: "Text"; value: string };
export type TripMessage = { type: "Trip"; value: Ref<Liane> };

export type MessageContent = TextMessage | TripMessage;

export type LianeMessage<T extends MessageContent = MessageContent> = Entity & { content: T };

export interface CommunityService {
  list(): Promise<CoLianeMatch[]>;

  get(liane: string): Promise<CoLiane>;

  create(lianeRequest: CoLianeRequest): Promise<CoLianeRequest>;

  update(lianeRequestId: string, request: ResolvedLianeRequest): Promise<CoLianeRequest>;

  delete(lianeRequestId: string): Promise<void>;

  joinRequest(mine: string, liane: string): Promise<boolean>;

  accept(lianeRequest: string, liane: string): Promise<CoLiane>;

  joinTrip(query: JoinTripQuery): Promise<boolean>;

  leave(liane: string): Promise<boolean>;

  getMessages(liane: string, pagination?: PaginatedRequestParams): Promise<PaginatedResponse<LianeMessage>>;

  sendMessage(liane: string, content: MessageContent): Promise<LianeMessage>;

  getUnreadLianes(): Promise<Record<string, number>>;
}

export class CommunityServiceClient implements CommunityService {
  constructor(protected http: HttpClient) {}

  list() {
    return this.http.get<CoLianeMatch[]>("/community/liane");
  }

  create(lianeRequest: CoLianeRequest) {
    return this.http.postAs<CoLianeRequest>("/community/liane", { body: lianeRequest });
  }

  async delete(lianeRequestId: string) {
    await this.http.del(`/community/liane/request/${lianeRequestId}`);
  }

  update(lianeRequestId: string, request: ResolvedLianeRequest) {
    return this.http.postAs<CoLianeRequest>(`/community/liane/request/${lianeRequestId}`, { body: request });
  }

  joinRequest(mine: string, liane: string) {
    return this.http.postAs<boolean>(`/community/liane/${liane}/join/${mine}`);
  }

  accept(lianeRequest: string, liane: string) {
    return this.http.postAs<CoLiane>(`/community/liane/${liane}/accept/${lianeRequest}`);
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
