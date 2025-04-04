import React from "react";
import { StatusBar } from "react-native";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";
import ContextProvider from "@/components/context/ContextProvider";
import { AppWindowsSizeProvider } from "@/components/base/AppWindowsSizeProvider";
import Navigation from "@/components/context/Navigation";
import { AppLinking, RootNavigation } from "@/components/context/routing";
import { NavigationContainer } from "@react-navigation/native";
import { DdRumReactNavigationTracking } from "@datadog/mobile-react-navigation";

const App = () => (
  <SafeAreaProvider initialMetrics={initialWindowMetrics}>
    <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
    <AppWindowsSizeProvider>
      <ContextProvider>
        <NavigationContainer
          linking={AppLinking}
          ref={RootNavigation}
          onReady={() => {
            DdRumReactNavigationTracking.startTrackingViews(RootNavigation.current);
          }}>
          <Navigation />
        </NavigationContainer>
      </ContextProvider>
    </AppWindowsSizeProvider>
  </SafeAreaProvider>
);
export default App;
