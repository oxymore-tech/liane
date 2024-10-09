import {
  Feedback,
  GeolocationLevel,
  Liane,
  LianeMatchDisplay,
  LianeRequest,
  LianeSearchFilter,
  LianeUpdate,
  PaginatedRequestParams,
  PaginatedResponse,
  TripStatus
} from "../api";
import { FeatureCollection } from "geojson";
import { HttpClient } from "./http";

export interface LianeService {
  get(lianeId: string): Promise<Liane>;
  list(states: TripStatus[], pagination: PaginatedRequestParams): Promise<PaginatedResponse<Liane>>;
  post(liane: LianeRequest): Promise<Liane>;
  match(filter: LianeSearchFilter): Promise<LianeMatchDisplay>;
  getContact(id: string, memberId: string): Promise<string>;
  updateDepartureTime(id: string, departureTime: string): Promise<Liane>;
  updateFeedback(id: string, feedback: Feedback): Promise<void>;
  cancel(id: string): Promise<void>;
  start(lianeId: string): Promise<void>;
  leave(id: string): Promise<void>;
  delete(lianeId: string): Promise<void>;
  setTracked(id: string, level: GeolocationLevel): Promise<void>;
  getProof(id: string): Promise<FeatureCollection>;
}
export class LianeServiceClient implements LianeService {
  constructor(protected http: HttpClient) {}

  async setTracked(id: string, level: GeolocationLevel): Promise<void> {
    await this.http.patch(`/trip/${id}/geolocation`, { body: level });
  }

  async get(id: string): Promise<Liane> {
    return await this.http.get<Liane>(`/trip/${id}`);
  }

  async getProof(id: string): Promise<FeatureCollection> {
    return await this.http.get<FeatureCollection>(`/trip/${id}/geolocation`);
  }

  async list(states: TripStatus[] = ["NotStarted", "Started"], pagination?: PaginatedRequestParams) {
    return await this.http.get<PaginatedResponse<Liane>>("/trip", { params: { ...(pagination ?? {}), state: states } });
  }

  async post(liane: LianeRequest): Promise<Liane> {
    return await this.http.postAs<Liane>("/trip/", { body: liane });
  }

  async match(filter: LianeSearchFilter): Promise<LianeMatchDisplay> {
    return await this.http.postAs<LianeMatchDisplay>("/trip/match/geojson", { body: filter });
  }

  async getContact(id: string, memberId: string): Promise<string> {
    return await this.http.get<string>(`/trip/${id}/members/${memberId}/contact`);
  }

  updateDepartureTime(id: string, departureTime: string): Promise<Liane> {
    return this.http.patchAs<Liane>(`/trip/${id}`, { body: <LianeUpdate>{ departureTime } });
  }

  async updateFeedback(id: string, feedback: Feedback): Promise<void> {
    await this.http.postAs(`/trip/${id}/feedback`, { body: feedback });
  }

  async delete(lianeId: string): Promise<void> {
    await this.http.del(`/trip/${lianeId}`);
  }

  async leave(id: string) {
    await this.http.postAs(`/trip/${id}/leave`);
  }

  async cancel(lianeId: string): Promise<void> {
    await this.http.postAs(`/trip/${lianeId}/cancel`);
  }

  async start(lianeId: string): Promise<void> {
    await this.http.postAs(`/trip/${lianeId}/start`);
  }
}
