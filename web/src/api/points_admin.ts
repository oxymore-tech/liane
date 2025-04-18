import { HttpClient, RallyingPoint, RallyingPointClient } from "@liane/common";
import { FeatureCollection, Point } from "geojson";
import { RallyingPointFullRequest, RallyingPointStats } from "@/api/api";

export interface PointsAdminService {
  getDepartmentRequestsAsGeoJson(department: string): Promise<FeatureCollection<GeoJSON.Point, RallyingPointFullRequest>>;
  getDepartmentPointsAsGeoJson(department: string): Promise<FeatureCollection<GeoJSON.Point, RallyingPoint>>;
  exportCsv(): Promise<Blob>;
  importCsv(csv: string): Promise<void>;
  getStats(id: string): Promise<RallyingPointStats>;
  update(id: string, payload: RallyingPoint): Promise<RallyingPoint>;
  create(payload: RallyingPoint): Promise<RallyingPoint>;
  delete(id: string): Promise<void>;
  deleteRequest(id: string): Promise<void>;
}
export class PointsAdminServiceClient extends RallyingPointClient implements PointsAdminService {
  constructor(http: HttpClient) {
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

  async deleteRequest(id: string): Promise<void> {
    await this.http.del(`/rallying_point/request/${id}`);
  }

  getDepartmentPointsAsGeoJson(department: string) {
    return this.http.get<FeatureCollection<Point, RallyingPoint>>(`/rallying_point/department/${department}`);
  }

  getDepartmentRequestsAsGeoJson(department: string) {
    return this.http.get<FeatureCollection<Point, RallyingPointFullRequest>>(`/rallying_point/request/department/${department}`);
  }

  exportCsv() {
    return this.http.getFile("/rallying_point/export");
  }

  getStats(id: string): Promise<RallyingPointStats> {
    return this.http.get<RallyingPointStats>(`/rallying_point/${id}/stats`);
  }

  async importCsv(csv: string): Promise<void> {
    const formData = new FormData();
    formData.append("file", new Blob([csv], { type: "text/csv" }));
    await this.http.postAs<void>("/rallying_point/import", {
      body: formData
    });
  }
}
