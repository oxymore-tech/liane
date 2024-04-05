import {
  JoinRequestDetailed,
  Trip,
  LianeRequest,
  LianeSearchFilter,
  PaginatedResponse,
  LianeMatchDisplay,
  Feedback,
  LianeUpdate,
  DayOfWeekFlag,
  TripRecurrence,
  TripState,
  GeolocationLevel,
  PaginatedRequestParams
} from "../api";
import { FeatureCollection } from "geojson";
import { JoinRequest } from "../event";
import { HttpClient } from "./http";

export interface TripService {
  get(lianeId: string): Promise<Trip>;
  list(states: TripState[], pagination: PaginatedRequestParams): Promise<PaginatedResponse<Trip>>;
  post(liane: LianeRequest): Promise<Trip>;
  join(joinRequest: JoinRequest): Promise<void>;
  match(filter: LianeSearchFilter): Promise<LianeMatchDisplay>;
  listJoinRequests(): Promise<PaginatedResponse<JoinRequestDetailed>>;
  getDetailedJoinRequest(joinRequestId: string): Promise<JoinRequestDetailed>;
  getContact(id: string, memberId: string): Promise<string>;
  getRecurrence(id: string): Promise<TripRecurrence>;
  addRecurrence(lianeId: string, recurrence: DayOfWeekFlag): Promise<void>;
  updateDepartureTime(id: string, departureTime: string): Promise<Trip>;
  updateRecurrence(id: string, recurrence: DayOfWeekFlag): Promise<void>;
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
export class TripServiceClient implements TripService {
  constructor(private http: HttpClient) {}

  async setTracked(id: string, level: GeolocationLevel): Promise<void> {
    await this.http.patch(`/trip/${id}/geolocation`, { body: level });
  }

  // GET
  async get(id: string): Promise<Trip> {
    return await this.http.get<Trip>(`/trip/${id}`);
  }

  async getProof(id: string): Promise<FeatureCollection> {
    return await this.http.get<FeatureCollection>(`/trip/${id}/geolocation`);
  }
  async list(states: TripState[] = ["NotStarted", "Started"], pagination?: PaginatedRequestParams) {
    return await this.http.get<PaginatedResponse<Trip>>("/trip", { params: { ...(pagination ?? {}), state: states } });
  }

  async post(liane: LianeRequest): Promise<Trip> {
    return await this.http.postAs<Trip>("/trip/", { body: liane });
  }

  async join(joinRequest: JoinRequest): Promise<void> {
    return await this.http.postAs(`/event/join_request`, { body: joinRequest }); // TODO now returns nothing ?
  }

  async match(filter: LianeSearchFilter): Promise<LianeMatchDisplay> {
    return await this.http.postAs<LianeMatchDisplay>("/trip/match/geojson", { body: filter });
  }

  async listJoinRequests(): Promise<PaginatedResponse<JoinRequestDetailed>> {
    return await this.http.get<PaginatedResponse<JoinRequestDetailed>>("/event/join_request/");
  }

  async getDetailedJoinRequest(joinRequestId: string): Promise<JoinRequestDetailed> {
    return await this.http.get<JoinRequestDetailed>("/event/join_request/" + joinRequestId);
  }

  async getContact(id: string, memberId: string): Promise<string> {
    return await this.http.get<string>(`/trip/${id}/members/${memberId}/contact`);
  }

  async getRecurrence(id: string): Promise<TripRecurrence> {
    return await this.http.get<TripRecurrence>(`/trip/recurrence/${id}`);
  }

  // PATCH
  async addRecurrence(lianeId: string, recurrence: DayOfWeekFlag): Promise<void> {
    console.log("TODO: ADD RECURRENCE TO ALREADY CREATE LIANE ROUTE", lianeId, recurrence);
  }

  updateDepartureTime(id: string, departureTime: string): Promise<Trip> {
    return this.http.patchAs<Trip>(`/trip/${id}`, { body: <LianeUpdate>{ departureTime } });
  }

  async updateRecurrence(id: string, recurrence: DayOfWeekFlag): Promise<void> {
    await this.http.patch(`/trip/recurrence/${id}`, { body: recurrence });
  }

  async updateFeedback(id: string, feedback: Feedback): Promise<void> {
    await this.http.postAs(`/trip/${id}/feedback`, { body: feedback });
  }

  async pause(id: string): Promise<void> {
    console.log("TODO: PAUSE LIANE ROUTE", id);
  }

  async unpause(id: string): Promise<void> {
    console.log("TODO: UNPAUSE LIANE ROUTE", id);
  }

  async delete(lianeId: string): Promise<void> {
    await this.http.del(`/trip/${lianeId}`);
  }

  async leave(id: string) {
    await this.http.postAs(`/trip/${id}/leave`);
  }

  async deleteJoinRequest(id: string): Promise<void> {
    await this.http.del(`/event/join_request/${id}`);
  }

  async cancel(lianeId: string): Promise<void> {
    await this.http.postAs(`/trip/${lianeId}/cancel`);
  }

  async start(lianeId: string): Promise<void> {
    await this.http.postAs(`/trip/${lianeId}/start`);
  }

  async deleteRecurrence(id: string): Promise<void> {
    await this.http.del(`/trip/recurrence/${id}`);
  }
}
