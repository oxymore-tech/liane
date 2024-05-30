import { ChatMessage, PaginatedRequestParams, PaginatedResponse } from "../api";
import { HttpClient } from "./http";

export interface ConversationService {
  getMessages(conversation: string, pagination?: PaginatedRequestParams): Promise<PaginatedResponse<ChatMessage>>;
}

export class ConversationServiceClient implements ConversationService {
  constructor(protected http: HttpClient) {}

  getMessages(id: string, params?: PaginatedRequestParams) {
    return this.http.get<PaginatedResponse<ChatMessage>>(`/conversation/${id}/message`, { params });
  }
}
