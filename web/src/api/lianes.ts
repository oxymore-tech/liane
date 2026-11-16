import { api } from "./index";
import type {
  Liane,
  LianeDetail,
  LianeInput,
  LianeSearchResult,
  Membership,
  MembershipInput,
  MyLiane,
  RallyingPoint,
  Report,
  RoutePreview,
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

/** Tracé, distance et durée pour une suite d'arrêts, sans rien enregistrer. */
export const previewRoute = (stopIds: string[]) =>
  api.postAs<RoutePreview>("/liane/route_preview", {
    body: { stop_ids: stopIds },
  });

export const recomputeRoute = (id: string) =>
  api.postAs<Liane>(`/liane/${id}/route`);

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

type Place = { lat: number; lng: number };

/** Lianes dont un arrêt est à moins de `radius` mètres du départ et un autre de l'arrivée. */
export const searchLianes = (from: Place, to: Place, radius: number) =>
  api.get<LianeSearchResult[]>("/liane/search", {
    params: {
      from_lat: from.lat,
      from_lng: from.lng,
      to_lat: to.lat,
      to_lng: to.lng,
      radius,
    },
  });

/** Lianes dont le tracé passe à moins de `radius` mètres du point touché sur la carte. */
export const listLianesNear = (point: Place, radius: number) =>
  api.get<Liane[]>("/liane/near", {
    params: { lat: point.lat, lng: point.lng, radius },
  });
