import React from "react";
import "../styles/tailwind.css";
import "@mdi/font/css/materialdesignicons.css";
import { ContextProvider } from "@/components/ContextProvider";

function MyApp({ Component, pageProps }) {
  return (
    <ContextProvider>
      <Component {...pageProps} />
    </ContextProvider>
  );
}

export default MyApp;
