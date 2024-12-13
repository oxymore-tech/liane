import urlJoin from "url-join";
import { DayOfWeekFlag } from "./api";

export type AppEnvVariables = {
  DD_CLIENT_TOKEN: string | null;
  DD_APP_ID: string | null;
  APP_ENV: string;
  APP_VERSION: string;
  API_URL: string | null;
  TILES_URL: string | null;
  MAPTILER_KEY: string;
  DEBUG_VIEWS: boolean | null;
  TEST_ACCOUNT: string;
};

export class AppEnv {
  constructor(public readonly raw: AppEnvVariables) {}

  get isDev() {
    return this.raw.APP_ENV !== "production";
  }

  get host() {
    return this.raw.APP_ENV === "production" ? "liane.app" : "dev.liane.app";
  }

  get baseUrl() {
    return urlJoin(this.raw.API_URL || `https://${this.host}`, "api");
  }

  get rallyingPointsTilesUrl() {
    return urlJoin(this.raw.TILES_URL || `https://${this.host}`, "rallying_point_display");
  }

  get lianeTilesUrl() {
    return urlJoin(this.raw.TILES_URL || `https://${this.host}`, "liane_display");
  }

  get lianeFilteredTilesUrl() {
    return urlJoin(this.raw.TILES_URL || `https://${this.host}`, "liane_display_filter_test");
  }

  public static getLianeDisplayParams(weekDays?: DayOfWeekFlag) {
    if (weekDays === undefined || weekDays === null) {
      return "";
    }
    return `weekDays=${weekDays}`;
  }
}
