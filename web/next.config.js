/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    API_URL: process.env.API_URL,
    APP_ENV: process.env.APP_ENV,
    APP_VERSION: process.env.APP_VERSION,
    DD_APP_ID: process.env.DD_APP_ID,
    DD_CLIENT_TOKEN: process.env.DD_CLIENT_TOKEN,
    DEBUG_VIEWS: process.env.DEBUG_VIEWS,
    MAPTILER_KEY: process.env.MAPTILER_KEY,
    TEST_ACCOUNT: process.env.TEST_ACCOUNT,
    TILES_URL: process.env.TILES_URL
  }
};
module.exports = nextConfig;
