import { DayOfWeekFlag, Entity, Liane, PaginatedRequestParams, PaginatedResponse, RallyingPoint, Ref, User, UTCDateTime } from "../api";
import { HttpClient } from "./http";
import { TimeRange } from "./time";
import { IUnion } from "../union";

export type TimeConstraint = {
  when: TimeRange;
  at: Ref<RallyingPoint>;
  weekDays?: DayOfWeekFlag;
};

export type CoLianeRequest = Entity & {
  name: string;
  wayPoints: Ref<RallyingPoint>[];
  roundTrip: boolean;
  canDrive: boolean;
  weekDays: DayOfWeekFlag;
  timeConstraints: TimeConstraint[];
  isEnabled: boolean;
};

export type ResolvedLianeRequest = Omit<CoLianeRequest, "wayPoints"> & { wayPoints: RallyingPoint[] };

export type CoLianeMatch = {
  lianeRequest: ResolvedLianeRequest;
  joinedLianes: MatchGroup[];
  matches: CoMatch[];
};

export type MatchSingle = {
  name: string;
  lianeRequest: ResolvedLianeRequest;
  user: Ref<User>;
  weekDays: DayOfWeekFlag;
  when: TimeRange;
  pickup: RallyingPoint;
  deposit: RallyingPoint;
  score: number;
};

export type MatchGroup = {
  name: string;
  liane: CoLiane;
  matches: MatchSingle[];
  weekDays: DayOfWeekFlag;
  when: TimeRange;
  pickup: RallyingPoint;
  deposit: RallyingPoint;
  score: number;
};

export type CoLiane = Entity & {
  name: string;
  members: CoLianeMember[];
};

export type CoLianeUpdate = {
  name: string;
};

export type CoLianeMember = {
  user: User;
  lianeRequest: ResolvedLianeRequest;
  joinedAt: UTCDateTime;
  lastReadAt?: UTCDateTime;
};

export type CoMatch = MatchSingle | MatchGroup;

export type MessageContentText = { value: string } & IUnion<"Text">;
export type MessageContentTrip = { value: Ref<Liane> } & IUnion<"Trip">;
export type MessageContent = MessageContentText | MessageContentTrip;

export type LianeMessage = Entity & { content: MessageContent };
export type TypedLianeMessage<T extends MessageContentText | MessageContentTrip> = LianeMessage & { content: T };

export interface CommunityService {
  list(): Promise<CoLianeMatch[]>;

  getLiane(liane: string): Promise<CoLiane>;

  create(lianeRequest: CoLianeRequest): Promise<CoLianeRequest>;

  update(lianeRequestId: string, request: ResolvedLianeRequest): Promise<CoLianeRequest>;

  delete(lianeRequestId: string): Promise<void>;

  joinNew(lianeRequestId: string, foreignLianeRequest: string): Promise<CoLiane>;

  join(lianeRequestId: string, liane: string): Promise<CoLiane>;

  updateLiane(lianeRequestId: string, request: CoLianeUpdate): Promise<CoLianeUpdate>;

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

  joinNew(id: string, lianeRequest: string) {
    return this.http.postAs<CoLiane>(`/community/liane/${id}/join_new/${lianeRequest}`);
  }

  join(id: string, liane: string) {
    return this.http.postAs<CoLiane>(`/community/liane/${id}/join/${liane}`);
  }

  updateLiane(lianeId: string, request: CoLianeUpdate) {
    return this.http.postAs<CoLiane>(`/community/liane/${lianeId}`, { body: request });
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

  getLiane(liane: string) {
    return this.http.get<CoLiane>(`/community/liane/${liane}`);
  }
}
