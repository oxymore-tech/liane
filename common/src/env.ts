
export type AppEnv = {
  DD_CLIENT_TOKEN: string | null;
  DD_APP_ID: string | null;
  APP_ENV: string;
  APP_VERSION: string;
  API_URL: string | null;
  TILES_URL: string | null;
  MAPTILER_KEY: string;
  DEBUG_VIEWS: boolean | null;
  TEST_ACCOUNT: string;
  
  isDev: boolean;
}