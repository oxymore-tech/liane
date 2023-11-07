import urlJoin from "url-join";

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
  public static readonly getLayerDateParams = (date: Date) =>
    "offset=" +
    date.getTimezoneOffset() +
    "&day=" +
    date.getFullYear() +
    "-" +
    (1 + date.getMonth()).toString().padStart(2, "0") +
    "-" +
    date.getDate().toString().padStart(2, "0");
}
