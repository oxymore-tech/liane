import { API_URL, APP_ENV, TILES_URL, DD_CLIENT_TOKEN, DD_APP_ID, APP_VERSION, MAPTILER_KEY, DEBUG_VIEWS, TEST_ACCOUNT } from "@env";
import { AppEnv as CommonAppEnv } from "@liane/common";

export const AppEnv = new CommonAppEnv({
  API_URL,
  APP_ENV,
  TILES_URL,
  DD_CLIENT_TOKEN,
  DD_APP_ID,
  APP_VERSION,
  MAPTILER_KEY,
  DEBUG_VIEWS,
  TEST_ACCOUNT
});
