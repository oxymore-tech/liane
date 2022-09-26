import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { DdRumReactNavigationTracking } from "@datadog/mobile-react-navigation";
import { TailwindProvider } from "tailwind-rn";
import ContextProvider from "@/components/ContextProvider";
import Navigation, { navigation } from "@/components/Navigation";
import utilities from "../tailwind.json";

function App() {
  return (
    // @ts-ignore
    <TailwindProvider utilities={utilities}>
      <ContextProvider>
        <NavigationContainer
          ref={navigation}
          onReady={() => {
            if (!__DEV__) {
              DdRumReactNavigationTracking.startTrackingViews(navigation.current);
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