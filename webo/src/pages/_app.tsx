import React from "react";
import "../styles/tailwind.css";
import "@mdi/font/css/materialdesignicons.css";
import { ContextProvider } from "@/components/ContextProvider";

function MyApp({ Component, pageProps }) {
  return (
    <ContextProvider>
      {/* eslint-disable-next-line react/jsx-props-no-spreading */}
      <Component {...pageProps} />
    </ContextProvider>
  );
}

export default MyApp;
