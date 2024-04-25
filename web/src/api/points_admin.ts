import { HttpClient, RallyingPoint, RallyingPointClient, SessionProvider } from "@liane/common";
import { FeatureCollection, Point } from "geojson";
import { RallyingPointFullRequest, RallyingPointStats } from "@/api/api";
import { NodeAppEnv } from "@/api/env";

export interface PointsAdminService {
  getDepartmentRequestsAsGeoJson(department: string): Promise<FeatureCollection<GeoJSON.Point, RallyingPointFullRequest>>;
  getDepartmentPointsAsGeoJson(department: string): Promise<FeatureCollection<GeoJSON.Point, RallyingPoint>>;
  exportCsv(): Promise<Blob>;
  importCsv(csv: string): Promise<void>;
  getStats(id: string): Promise<RallyingPointStats>;
  update(id: string, payload: RallyingPoint): Promise<RallyingPoint>;
  create(payload: RallyingPoint): Promise<RallyingPoint>;
  delete(id: string): Promise<void>;
}
export class PointsAdminServiceClient extends RallyingPointClient implements PointsAdminService {
  constructor(
    http: HttpClient,
    private readonly storage: SessionProvider
  ) {
    super(http);
  }

  async update(id: string, payload: RallyingPoint) {
    await this.http.patchAs<RallyingPoint>(`/rallying_point/${id}`, { body: payload });
    return payload;
  }
  create(payload: RallyingPoint) {
    return this.http.postAs<RallyingPoint>(`/rallying_point`, { body: payload });
  }
  async delete(id: string): Promise<void> {
    await this.http.del(`/rallying_point/${id}`);
  }
  getDepartmentPointsAsGeoJson(department: string) {
    return this.http.get<FeatureCollection<Point, RallyingPoint>>(`/rallying_point/department/${department}`);
  }

  getDepartmentRequestsAsGeoJson(department: string) {
    return this.http.get<
      FeatureCollection<
        Point,
        {
          id: string;
        }
      >
    >(`/rallying_point/request/department/${department}`);
  }

  exportCsv() {
    return this.http.getFile("/rallying_point/export");
  }

  getStats(id: string): Promise<RallyingPointStats> {
    return this.http.get<RallyingPointStats>(`/rallying_point/${id}/stats`);
  }

  async importCsv(csv: string): Promise<void> {
    // TODO should be formData
    const response = await fetch(NodeAppEnv.baseUrl + "/rallying_point/import", {
      method: "POST",
      headers: { "Content-Type": "text/csv", Authorization: "Bearer " + (await this.storage.getAccessToken()) },
      body: csv
    });
    if (response.status === 200) {
      return;
    } else {
      throw new Error("API returned error " + response.status);
    }
  }
}
