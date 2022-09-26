import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { DdRumReactNavigationTracking } from "@datadog/mobile-react-navigation";
import { TailwindProvider } from "tailwind-rn";
import ContextProvider from "@/components/ContextProvider";
import utilities from "../tailwind.json";
import { RootNavigation } from "@/api/navigation";
import Navigation from "@/components/Navigation";

function App() {
  return (
    // @ts-ignore
    <TailwindProvider utilities={utilities}>
      <ContextProvider>
        <NavigationContainer
          ref={RootNavigation}
          onReady={() => {
            if (!__DEV__) {
              DdRumReactNavigationTracking.startTrackingViews(RootNavigation.current);
            }
          }}
        >
          <Navigation />
        </NavigationContainer>
      </ContextProvider>
    </TailwindProvider>
  );
}

export default App;