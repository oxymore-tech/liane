import { get, post, postAs } from "@/api/http";
import { AuthResponse } from "@/api";

export interface AuthService {
  login(phone: string, code: string): Promise<AuthResponse>;
  me(): Promise<AuthResponse>;
  sendSms(phone: string): Promise<void>;
}

export class AuthServiceClient implements AuthService {

  me(): Promise<AuthResponse> {
    return get("/auth/me");
  }

  async login(phone: string, code: string): Promise<AuthResponse> {
    return postAs("/auth/login", { params: { phone, code } });
  }

  async sendSms(phone: string): Promise<any> { // TODO
    return post("/auth/sms", { params: { phone } });
  }

}
