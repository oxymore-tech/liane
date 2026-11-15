import { api } from "./index";
import type {
  Liane,
  LianeDetail,
  LianeInput,
  Membership,
  MembershipInput,
  MyLiane,
  RallyingPoint,
  Report,
} from "./types";

export const listLianes = () => api.get<Liane[]>("/liane");

export const getLiane = (slug: string) =>
  api.get<LianeDetail>(`/liane/${encodeURIComponent(slug)}`);

export const listMyLianes = () => api.get<MyLiane[]>("/liane/mine");

export const joinLiane = (id: string, body: MembershipInput) =>
  api.postAs<Membership>(`/liane/${id}/membership`, { body });

export const updateMembership = (id: string, body: MembershipInput) =>
  api.putAs<Membership>(`/liane/${id}/membership`, { body });

export const leaveLiane = (id: string) => api.del(`/liane/${id}/membership`);

export const reportMember = (id: string, userId: string, reason: string) =>
  api.post(`/liane/${id}/member/${userId}/report`, { body: { reason } });

export const listAllLianes = () => api.get<Liane[]>("/liane/admin");

export const createLiane = (body: LianeInput) =>
  api.postAs<Liane>("/liane", { body });

export const updateLiane = (id: string, body: LianeInput) =>
  api.putAs<Liane>(`/liane/${id}`, { body });

export const deleteLiane = (id: string) => api.del(`/liane/${id}`);

export const listReports = () => api.get<Report[]>("/liane/report");

export const excludeReported = (reportId: string) =>
  api.post(`/liane/report/${reportId}/exclude`);

export const dismissReport = (reportId: string) =>
  api.post(`/liane/report/${reportId}/dismiss`);

export const searchRallyingPoints = (
  search: string,
  near: { lat: number; lng: number },
) =>
  api.get<RallyingPoint[]>("/rallying_point", {
    params: { search, lat: near.lat, lng: near.lng, limit: 8 },
  });

export const snapRallyingPoint = (lat: number, lng: number) =>
  api.get<RallyingPoint>("/rallying_point/snap", { params: { lat, lng } });
