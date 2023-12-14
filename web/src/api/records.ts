import { HttpClient, PaginatedResponse } from "@liane/common";
import { FeatureCollection } from "geojson";
import { TripRecord, TripRecordFilterParams } from "@/api/api";

export interface RecordService {
  list(params?: TripRecordFilterParams): Promise<PaginatedResponse<TripRecord>>;
  get(id: string): Promise<TripRecord>;
  getRecordPings(id: string, raw?: boolean): Promise<FeatureCollection<GeoJSON.Point, { user: string; at: string }>>;
  recreate(id: string): Promise<void>;
}
export class RecordServiceClient implements RecordService {
  constructor(private http: HttpClient) {}

  list(params?: TripRecordFilterParams) {
    return this.http.get<PaginatedResponse<TripRecord>>(`/liane/record`, { params });
  }
  get(id: string) {
    return this.http.get<TripRecord>(`/liane/record/${id}`);
  }
  getRecordPings(id: string, raw?: boolean): Promise<FeatureCollection<GeoJSON.Point, { user: string; at: string }>> {
    return this.http.get<FeatureCollection<GeoJSON.Point, { user: string; at: string }>>(`/liane/${id}/geolocation`, {
      params: { raw: raw ?? false }
    });
  }
  async recreate(id: string) {
    await this.http.post(`/liane/record/${id}/recreate`);
  }
}
