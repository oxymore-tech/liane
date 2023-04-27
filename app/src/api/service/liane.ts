import {
  JoinLianeRequestDetailed,
  JoinRequest,
  LatLng,
  Liane,
  LianeEvent,
  LianeMatch,
  LianeRequest,
  LianeSearchFilter,
  MemberRejected,
  MemberAccepted,
  PaginatedResponse,
  NotificationPayload,
  UTCDateTime,
  LianeMatchDisplay,
  NearestLinks
} from "@/api";
import { get, postAs, del, patch } from "@/api/http";
import { FeatureCollection } from "geojson";

export interface LianeService {
  list(): Promise<PaginatedResponse<Liane>>;
  post(liane: LianeRequest): Promise<Liane>;
  match(filter: LianeSearchFilter): Promise<PaginatedResponse<LianeMatch>>;
  match2(filter: LianeSearchFilter): Promise<LianeMatchDisplay>;
  // links(pickup: Ref<RallyingPoint>, afterDate?: Date): Promise<NearestLinks>;
  nearestLinks(center: LatLng, radius: number, afterDate?: Date): Promise<NearestLinks>;
  display(from: LatLng, to: LatLng, afterDate?: Date): Promise<FeatureCollection>;
  join(joinRequest: JoinRequest): Promise<JoinRequest>;
  getDetailedJoinRequest(joinRequestId: string): Promise<JoinLianeRequestDetailed>;
  answer(accept: boolean, event: NotificationPayload<JoinRequest>): Promise<void>;
  get(lianeId: string): Promise<Liane>;
  listJoinRequests(): Promise<PaginatedResponse<JoinLianeRequestDetailed>>;
  delete(lianeId: string): Promise<void>;
  deleteJoinRequest(id: string): Promise<void>;
  updateDepartureTime(id: string, departureTime: UTCDateTime): Promise<void>;
}

export class LianeServiceClient implements LianeService {
  async delete(lianeId: string): Promise<void> {
    await del(`/liane/${lianeId}`);
  }
  async list() {
    const lianes = await get<PaginatedResponse<Liane>>("/liane/");
    console.debug(JSON.stringify(lianes));
    return lianes;
  }

  listJoinRequests() {
    return get<PaginatedResponse<JoinLianeRequestDetailed>>("/event/join_request/");
  }

  get(id: string) {
    return get<Liane>(`/liane/${id}`);
  }

  post(liane: LianeRequest) {
    return postAs<Liane>("/liane/", { body: liane });
  }

  match(filter: LianeSearchFilter) {
    return postAs<PaginatedResponse<LianeMatch>>("/liane/match", { body: filter });
  }

  display(from: LatLng, to: LatLng, afterDate?: Date) {
    const params = { lat: from.lat, lng: from.lng, lat2: to.lat, lng2: to.lng };
    if (afterDate) {
      // @ts-ignore
      params.after = afterDate.valueOf();
    }
    return get<FeatureCollection>("/liane/display/geojson", { params });
  }

  nearestLinks(center: LatLng, radius: number, afterDate?: Date): Promise<NearestLinks> {
    const params = { lat: center.lat, lng: center.lng, radius: radius };
    if (afterDate) {
      // @ts-ignore
      params.after = afterDate.valueOf();
    }
    return get("/liane/links", { params });
  }

  join(joinRequest: JoinRequest) {
    return postAs<JoinRequest>(`/event`, { body: joinRequest });
  }

  getDetailedJoinRequest(joinRequestId: string): Promise<JoinLianeRequestDetailed> {
    return get<JoinLianeRequestDetailed>("/event/join_request/" + joinRequestId);
  }

  async answer(accept: boolean, event: NotificationPayload<JoinRequest>) {
    let lianeEvent: LianeEvent;
    if (accept) {
      lianeEvent = <MemberAccepted>{
        _t: "MemberAccepted",
        liane: event.content.liane,
        member: event.createdBy.id,
        to: event.content.to,
        from: event.content.from,
        seats: event.content.seats,
        takeReturnTrip: event.content.takeReturnTrip
      };
    } else {
      lianeEvent = <MemberRejected>{ type: "MemberRejected", liane: event.content.liane, member: event.createdBy.id };
    }
    await postAs("/event/" + event.id!, { body: lianeEvent });
  }
  async deleteJoinRequest(id: string): Promise<void> {
    await del(`/event/join_request/${id}`);
  }

  async updateDepartureTime(id: string, departureTime: UTCDateTime): Promise<void> {
    await patch(`/liane/${id}`, { body: departureTime });
  }

  match2(filter: LianeSearchFilter): Promise<LianeMatchDisplay> {
    return postAs<LianeMatchDisplay>("/liane/match/geojson", { body: filter });
  }
}
