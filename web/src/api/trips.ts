import { api } from "./index";
import type {
  AdminTrip,
  GestureInput,
  MyTrips,
  Trip,
  TripDetail,
  TripInput,
} from "./types";

export const listLianeTrips = (lianeId: string) =>
  api.get<Trip[]>(`/liane/${lianeId}/trip`);

export const createTrip = (lianeId: string, body: TripInput) =>
  api.postAs<TripDetail>(`/liane/${lianeId}/trip`, { body });

export const listMyTrips = () => api.get<MyTrips>("/trip/mine");

export const getTrip = (id: string) => api.get<TripDetail>(`/trip/${id}`);

export const cancelTrip = (id: string) => api.del(`/trip/${id}`);

export const bookTrip = (id: string, fromStopId: string, toStopId: string) =>
  api.postAs<TripDetail>(`/trip/${id}/passenger`, {
    body: { from_stop_id: fromStopId, to_stop_id: toStopId },
  });

export const unbookTrip = (id: string) => api.del(`/trip/${id}/passenger`);

export const recordGesture = (id: string, body: GestureInput) =>
  api.postAs<TripDetail>(`/trip/${id}/gesture`, { body });

export const listAllTrips = () => api.get<AdminTrip[]>("/trip/admin");

/** Couples conducteur/passager au format du registre de preuve ; contient des numéros de téléphone. */
export const exportProofs = () => api.get<unknown[]>("/trip/admin/export");
