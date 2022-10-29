import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { DdRumReactNavigationTracking } from "@datadog/mobile-react-navigation";
import ContextProvider from "@/components/ContextProvider";
import { RootNavigation } from "@/api/navigation";
import Navigation from "@/components/Navigation";

function App() {
  return (
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
  );
}

export default App;