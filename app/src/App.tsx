import React, { useRef } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { DdRumReactNavigationTracking } from "@datadog/mobile-react-navigation";
import { TailwindProvider } from "tailwind-rn";
import ContextProvider from "@/components/ContextProvider";
import Navigation from "@/components/Navigation";
import utilities from "../tailwind.json";

function App() {

  const navigationRef = useRef(null);

  return (
    // @ts-ignore
    <TailwindProvider utilities={utilities}>
      <ContextProvider>
        <NavigationContainer
          ref={navigationRef}
          onReady={() => {
            DdRumReactNavigationTracking.startTrackingViews(navigationRef.current);
          }}
        >
          <Navigation />
        </NavigationContainer>
      </ContextProvider>
    </TailwindProvider>
  );
}

export default App;