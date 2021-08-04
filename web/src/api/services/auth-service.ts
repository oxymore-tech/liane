import { get, post, postAs } from "@/api/http";
import { AuthUser } from "@/api";

/**
 * Class that manages authentication.
 */
export class AuthService {

  /**
   * Authenticates.
   */
  static me(): Promise<AuthUser> {
    return get("/api/auth/me");
  }

  /**
   * Tries to log in.
   */
  static async login(phone: string, code: string, token?: string): Promise<AuthUser> {
    return postAs("/api/auth/login", { params: { phone, code, token } });
  }

  /**
   * Triggers the emission of an SMS.
   */
  static async sendSms(phone: string) {
    return post("/api/auth/sms", { params: { phone } });
  }

}
