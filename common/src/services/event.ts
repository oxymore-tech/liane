import { MemberPing } from "../event";
import { HttpClient } from "./http";

export interface EventService {
  sendPing(ping: MemberPing): Promise<void>;
}

export class EventServiceClient implements EventService {
  constructor(protected http: HttpClient) {}

  async sendPing(ping: MemberPing): Promise<void> {
    await this.http.postAs(`/event/member_ping`, { body: ping });
  }
}
