import { api } from "./index";
import type { AdminRallyingPoint, RallyingPointInput } from "./types";

/** Points désactivés compris, les plus proches de `near` d'abord. */
export const searchAdminRallyingPoints = (
  search: string,
  near: { lat: number; lng: number },
) =>
  api.get<AdminRallyingPoint[]>("/rallying_point/admin", {
    params: { search, lat: near.lat, lng: near.lng, limit: 30 },
  });

export const getAdminRallyingPoint = (id: string) =>
  api.get<AdminRallyingPoint>(`/rallying_point/${id}`);

export const createRallyingPoint = (body: RallyingPointInput) =>
  api.postAs<AdminRallyingPoint>("/rallying_point", { body });

export const updateRallyingPoint = (id: string, body: RallyingPointInput) =>
  api.putAs<AdminRallyingPoint>(`/rallying_point/${id}`, { body });
