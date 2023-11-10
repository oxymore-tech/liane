import { get, post, postAs } from "@/api/http";
import { AuthResponse } from "@/api";

/**
 * Class to manage authentication.
 */
export class AuthService {
  
  static me(): Promise<AuthResponse> {
    return get("/api/auth/me");
  }
  
  static async login(phone: string, code: string): Promise<AuthResponse> {
    return postAs("/api/auth/login", { params: { phone, code } });
  }
  
  static async sendSms(phone: string) {
    return post("/api/auth/sms", { params: { phone } });
  }

}
