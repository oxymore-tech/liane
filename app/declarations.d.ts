declare module "*.svg" {
  import React from "react";
  import { SvgProps } from "react-native-svg";

  const content: React.FC<SvgProps>;
  export default content;
}

declare module "@env" {
  export const DD_CLIENT_TOKEN: string;
  export const DD_APP_ID: string;
  export const API_URL: string;
  export const APP_ENV: string;
}