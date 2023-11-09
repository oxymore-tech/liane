import { AppEnv } from "@liane/common";

export const NodeAppEnv = new AppEnv({
  API_URL: process.env.API_URL as string,
  APP_ENV: process.env.APP_ENV as string,
  APP_VERSION: process.env.APP_VERSION as string,
  DD_APP_ID: process.env.DD_APP_ID as string,
  DD_CLIENT_TOKEN: process.env.DD_CLIENT_TOKEN as string,
  DEBUG_VIEWS: (process.env.DEBUG_VIEWS as string) === "true",
  MAPTILER_KEY: process.env.MAPTILER_KEY as string,
  TEST_ACCOUNT: process.env.TEST_ACCOUNT as string,
  TILES_URL: process.env.TILES_URL as string
});
