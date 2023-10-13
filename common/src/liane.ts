import {
  JoinLianeRequestDetailed,
  Liane,
  LianeRequest,
  LianeSearchFilter,
  PaginatedResponse,
  LianeMatchDisplay,
  Feedback,
  LianeUpdate,
  DayOfTheWeekFlag,
  LianeRecurrence,
  LianeState,
  GeolocationLevel
} from "./api";
import { FeatureCollection } from "geojson";
import { JoinRequest } from "./event";
import { HttpClient } from "./http";

export interface LianeService {
  get(lianeId: string): Promise<Liane>;
  list(states: LianeState[], cursor?: string, pageSize?: number, asc?: boolean): Promise<PaginatedResponse<Liane>>;
  post(liane: LianeRequest): Promise<Liane>;
  join(joinRequest: JoinRequest): Promise<JoinRequest>;
  match(filter: LianeSearchFilter): Promise<LianeMatchDisplay>;
  listJoinRequests(): Promise<PaginatedResponse<JoinLianeRequestDetailed>>;
  getDetailedJoinRequest(joinRequestId: string): Promise<JoinLianeRequestDetailed>;
  getContact(id: string, memberId: string): Promise<string>;
  getRecurrence(id: string): Promise<LianeRecurrence>;
  addRecurrence(lianeId: string, recurrence: DayOfTheWeekFlag): Promise<void>;
  updateDepartureTime(id: string, departureTime: string): Promise<Liane>;
  updateRecurrence(id: string, recurrence: DayOfTheWeekFlag): Promise<void>;
  updateFeedback(id: string, feedback: Feedback): Promise<void>;
  pause(id: string): Promise<void>;
  unpause(id: string): Promise<void>;
  cancel(id: string): Promise<void>;
  start(lianeId: string): Promise<void>;
  leave(id: string): Promise<void>;
  delete(lianeId: string): Promise<void>;
  deleteJoinRequest(id: string): Promise<void>;
  deleteRecurrence(id: string): Promise<void>;
  setTracked(id: string, level: GeolocationLevel): Promise<void>;
  getProof(id: string): Promise<FeatureCollection>;
}
export class LianeServiceClient implements LianeService {
  constructor(private http: HttpClient) {}

  async setTracked(id: string, level: GeolocationLevel): Promise<void> {
    await this.http.patch(`/liane/${id}/geolocation`, { body: level });
  }

  // GET
  async get(id: string): Promise<Liane> {
    return await this.http.get<Liane>(`/liane/${id}`);
  }

  async getProof(id: string): Promise<FeatureCollection> {
    return await this.http.get<FeatureCollection>(`/liane/${id}/geolocation`);
  }
  async list(
    states: LianeState[] = ["NotStarted", "Started"],
    cursor: string | undefined = undefined,
    pageSize: number = 10,
    asc: boolean | undefined = undefined
  ) {
    let paramString = "?" + states.map((state: string) => `state=${state}`).join("&");
    if (cursor) {
      paramString += `&cursor=${cursor}`;
    }
    if (pageSize) {
      paramString += `&limit=${pageSize}`;
    }
    if (asc !== undefined) {
      paramString += `&asc=${asc}`;
    }
    return await this.http.get<PaginatedResponse<Liane>>("/liane" + paramString);
  }

  async post(liane: LianeRequest): Promise<Liane> {
    return await this.http.postAs<Liane>("/liane/", { body: liane });
  }

  async join(joinRequest: JoinRequest): Promise<JoinRequest> {
    return await this.http.postAs<JoinRequest>(`/event/join_request`, { body: joinRequest }); // TODO now returns nothing ?
  }

  async match(filter: LianeSearchFilter): Promise<LianeMatchDisplay> {
    return await this.http.postAs<LianeMatchDisplay>("/liane/match/geojson", { body: filter });
  }

  async listJoinRequests(): Promise<PaginatedResponse<JoinLianeRequestDetailed>> {
    return await this.http.get<PaginatedResponse<JoinLianeRequestDetailed>>("/event/join_request/");
  }

  async getDetailedJoinRequest(joinRequestId: string): Promise<JoinLianeRequestDetailed> {
    return await this.http.get<JoinLianeRequestDetailed>("/event/join_request/" + joinRequestId);
  }

  async getContact(id: string, memberId: string): Promise<string> {
    return await this.http.get<string>(`/liane/${id}/members/${memberId}/contact`);
  }

  async getRecurrence(id: string): Promise<LianeRecurrence> {
    return await this.http.get<LianeRecurrence>(`/liane/recurrence/${id}`);
  }

  // PATCH
  async addRecurrence(lianeId: string, recurrence: DayOfTheWeekFlag): Promise<void> {
    console.log("TODO: ADD RECURRENCE TO ALREADY CREATE LIANE ROUTE", lianeId, recurrence);
  }

  updateDepartureTime(id: string, departureTime: string): Promise<Liane> {
    return this.http.patchAs<Liane>(`/liane/${id}`, { body: <LianeUpdate>{ departureTime } });
  }

  async updateRecurrence(id: string, recurrence: DayOfTheWeekFlag): Promise<void> {
    await this.http.patch(`/liane/recurrence/${id}`, { body: recurrence });
  }

  async updateFeedback(id: string, feedback: Feedback): Promise<void> {
    await this.http.postAs(`/liane/${id}/feedback`, { body: feedback });
  }

  async pause(id: string): Promise<void> {
    console.log("TODO: PAUSE LIANE ROUTE", id);
  }

  async unpause(id: string): Promise<void> {
    console.log("TODO: UNPAUSE LIANE ROUTE", id);
  }

  async delete(lianeId: string): Promise<void> {
    await this.http.del(`/liane/${lianeId}`);
  }

  async leave(id: string) {
    await this.http.postAs(`/liane/${id}/leave`);
  }

  async deleteJoinRequest(id: string): Promise<void> {
    await this.http.del(`/event/join_request/${id}`);
  }

  async cancel(lianeId: string): Promise<void> {
    await this.http.postAs(`/liane/${lianeId}/cancel`);
  }

  async start(lianeId: string): Promise<void> {
    await this.http.postAs(`/liane/${lianeId}/start`);
  }

  async deleteRecurrence(id: string): Promise<void> {
    await this.http.del(`/liane/recurrence/${id}`);
  }
}
