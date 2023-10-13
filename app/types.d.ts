declare module "*.svg" {
  import React from "react";
  import { SvgProps } from "react-native-svg";

  const content: React.FC<SvgProps>;
  export default content;
}

declare module "@env" {
  export const DD_CLIENT_TOKEN: string | null;
  export const DD_APP_ID: string | null;
  export const APP_ENV: string;
  export const APP_VERSION: string;
  export const API_URL: string | null;
  export const TILES_URL: string | null;
  export const MAPTILER_KEY: string;
  export const DEBUG_VIEWS: boolean | null;
  export const TEST_ACCOUNT: string;
}
