import { DayOfWeekFlag, Entity, Liane, LianeMember, PaginatedRequestParams, PaginatedResponse, RallyingPoint, Ref, User, UTCDateTime } from "../api";
import { HttpClient } from "./http";
import { TimeRange } from "./time";

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

export type CoLianeMatch = {
  lianeRequest: CoLianeRequest;
  joindedLianes: MatchGroup[];
  matches: CoMatch[];
};

export type MatchSingle = {
  name: string;
  lianeRequest: Ref<CoLianeRequest>;
  user: Ref<User>;
  weekDays: DayOfWeekFlag;
  pickup: Ref<RallyingPoint>;
  deposit: Ref<RallyingPoint>;
  score: number;
};

export type MatchGroup = {
  name: string;
  liane: CoLiane;
  matches: MatchSingle[];
  weekDays: DayOfWeekFlag;
  pickup: Ref<RallyingPoint>;
  deposit: Ref<RallyingPoint>;
  score: number;
};

export type CoLiane = Entity & {
  name: string;
  members: LianeMember[];
};

export type CoLianeMember = {
  User: User;
  lianeRequest: Ref<CoLianeRequest>;
  joinedAt: UTCDateTime;
  lastReadAt?: UTCDateTime;
};

export type CoMatch = MatchSingle | MatchGroup;

export type MessageContentText = { type: "text"; value: string };
export type MessageContentTrip = { type: "trip"; value: Ref<Liane> };
export type MessageContent = MessageContentText | MessageContentTrip;

export type LianeMessage = Entity & { content: MessageContent };

export interface CommunityService {
  list(): Promise<CoLianeRequest[]>;
  create(lianeRequest: CoLianeRequest): Promise<CoLianeRequest>;
  setEnabled(lianeRequestId: string, isEnabled: boolean): Promise<void>;

  joinNew(lianeRequestId: string, foreignLianeRequest: string): Promise<CoLiane>;
  join(lianeRequestId: string, liane: string): Promise<CoLiane>;
  leave(liane: string): Promise<boolean>;

  getMessages(liane: string, pagination?: PaginatedRequestParams): Promise<PaginatedResponse<LianeMessage>>;
  sendMessage(liane: string, content: MessageContent): Promise<LianeMessage>;

  getUnreadLianes(): Promise<Record<Ref<CoLiane>, number>>;
}

export class CommunityServiceClient implements CommunityService {
  constructor(protected http: HttpClient) {}

  list() {
    return this.http.get<CoLianeRequest[]>("/community/liane");
  }

  create(lianeRequest: CoLianeRequest) {
    return this.http.postAs<CoLianeRequest>("/community/liane", { body: lianeRequest });
  }

  async setEnabled(lianeRequestId: string, isEnabled: boolean) {
    await this.http.post(`/community/liane/${lianeRequestId}/${isEnabled}`);
  }

  joinNew(id: string, lianeRequest: string) {
    return this.http.postAs<CoLiane>(`/community/liane/${id}/join_new/${lianeRequest}`);
  }

  join(id: string, liane: string) {
    return this.http.postAs<CoLiane>(`/community/liane/${id}/join/${liane}`);
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
    return this.http.get<Record<Ref<CoLiane>, number>>("/community/liane/unread");
  }
}
