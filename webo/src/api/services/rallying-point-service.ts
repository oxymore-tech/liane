import { post, put, remove } from "@/api/http";
import { RallyingPoint } from "@/api/";
import { AuthResponse, AuthUser, HttpClient } from "liane-common";

/**
 * Class to manage rallying points.
 */
export class RallyingPointService {

  static async create(label: string, lat: number, lng: number, isActive: boolean = true) {
    await post("/api/rallying_point", { params: { location: { lat, lng }, label, isActive } as RallyingPoint });
  }
  
  static async delete(id: string) {
    await remove(`/api/rallying_point/${id}`);
  }
  
  static async list(lat?: number, lng?: number, search?: string): Promise<RallyingPoint[]> {
    // @ts-ignore
    const http = new HttpClient({ 
      env: {
        API_URL: "https://dev.liane.app",
        DD_CLIENT_TOKEN: null,
        DD_APP_ID: null,
        APP_ENV: "",
        APP_VERSION: "",
        TILES_URL: null,
        MAPTILER_KEY: "",
        DEBUG_VIEWS: null,
        TEST_ACCOUNT: "",
        isDev: false
      }, 
      logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
      storage: {
        getRefreshToken: function (): Promise<string | undefined> {
          return Promise.resolve("test");
        },
        getUserSession: function (): Promise<AuthUser | undefined> {
          return Promise.resolve(undefined);
        },
        processAuthResponse: function (authResponse: AuthResponse): Promise<AuthUser> {
          return Promise.resolve(authResponse.user);
        },
        clearStorage: function (): Promise<void> {
          return Promise.resolve(undefined);
        },
        getAccessToken: function (): Promise<string | undefined> {
          return Promise.resolve(undefined);
        }
      }
    }
    );
    return http.get("/api/rallying_point", { params: { lat, lng, search } });
  }
  
  static async update(id: string, label: string, lat: number, lng: number, isActive: boolean) {
    return put(`/api/rallying_point/${id}`, { body: { params: { location: { lat, lng }, label, isActive } as RallyingPoint, bodyAsJson: true } });
  }
  
  static async generate() {
    await post("/api/rallying_point/generate");
  }

}
