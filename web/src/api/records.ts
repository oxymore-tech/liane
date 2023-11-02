import { HttpClient, PaginatedRequestParams, PaginatedResponse } from "@liane/common";
import { FeatureCollection } from "geojson";
import { TripRecord, TripRecordFilterParams } from "@/api/api";

export interface RecordService {
  list(pagination?: PaginatedRequestParams): Promise<PaginatedResponse<TripRecord>>;
  get(id: string): Promise<TripRecord>;
  getRecordPings(id: string): Promise<FeatureCollection<GeoJSON.Point, { user: string; at: string }>>;
}
export class RecordServiceClient {
  constructor(private http: HttpClient) {}

  list(pagination?: PaginatedRequestParams, filter?: TripRecordFilterParams) {
    return this.http.get<PaginatedResponse<TripRecord>>(`/liane/record`, { params: { ...pagination, ...filter } });
  }
  get(id: string) {
    return this.http.get<TripRecord>(`/liane/record/${id}`);
  }
  getRecordPings(id: string): Promise<FeatureCollection<GeoJSON.Point, { user: string; at: string }>> {
    return this.http.get<FeatureCollection<GeoJSON.Point, { user: string; at: string }>>(`/liane/${id}/geolocation`);
  }
}
