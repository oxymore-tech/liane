import {
  Feedback,
  GeolocationLevel,
  Trip,
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

export interface TripService {
  get(lianeId: string): Promise<Trip>;
  list(states: TripStatus[], pagination: PaginatedRequestParams): Promise<PaginatedResponse<Trip>>;
  post(liane: LianeRequest): Promise<Trip>;
  match(filter: LianeSearchFilter): Promise<LianeMatchDisplay>;
  getContact(id: string, memberId: string): Promise<string>;
  updateDepartureTime(id: string, departureTime: string): Promise<Trip>;
  updateFeedback(id: string, feedback: Feedback): Promise<void>;
  cancel(id: string): Promise<void>;
  start(lianeId: string): Promise<void>;
  leave(id: string): Promise<void>;
  delete(lianeId: string): Promise<void>;
  setTracked(id: string, level: GeolocationLevel): Promise<void>;
  getProof(id: string): Promise<FeatureCollection>;
}

export class TripServiceClient implements TripService {
  constructor(protected http: HttpClient) {}

  async setTracked(id: string, level: GeolocationLevel): Promise<void> {
    await this.http.patch(`/trip/${id}/geolocation`, { body: level });
  }

  async get(id: string): Promise<Trip> {
    return await this.http.get<Trip>(`/trip/${id}`);
  }

  async getProof(id: string): Promise<FeatureCollection> {
    return await this.http.get<FeatureCollection>(`/trip/${id}/geolocation`);
  }

  async list(states: TripStatus[] = ["NotStarted", "Started"], pagination?: PaginatedRequestParams) {
    return await this.http.get<PaginatedResponse<Trip>>("/trip", { params: { ...(pagination ?? {}), state: states } });
  }

  async post(liane: LianeRequest): Promise<Trip> {
    return await this.http.postAs<Trip>("/trip/", { body: liane });
  }

  async match(filter: LianeSearchFilter): Promise<LianeMatchDisplay> {
    return await this.http.postAs<LianeMatchDisplay>("/trip/match/geojson", { body: filter });
  }

  async getContact(id: string, memberId: string): Promise<string> {
    return await this.http.get<string>(`/trip/${id}/members/${memberId}/contact`);
  }

  updateDepartureTime(id: string, departureTime: string): Promise<Trip> {
    return this.http.patchAs<Trip>(`/trip/${id}`, { body: <LianeUpdate>{ departureTime } });
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
