import React from "react";
import { StatusBar } from "react-native";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";
import ContextProvider from "@/components/context/ContextProvider";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { AppWindowsSizeProvider } from "@/components/base/AppWindowsSizeProvider";
import { AppBackContextProvider } from "@/components/AppBackContextProvider";
import Navigation from "@/components/context/Navigation";
import { AppLinking, RootNavigation } from "@/components/context/routing";
import { NavigationContainer } from "@react-navigation/native";
import { AppModalNavigationProvider } from "@/components/AppModalNavigationProvider";
import { DdRumReactNavigationTracking } from "@datadog/mobile-react-navigation";

MapLibreGL.setAccessToken(null);

const App = () => (
  <SafeAreaProvider initialMetrics={initialWindowMetrics}>
    <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
    <AppWindowsSizeProvider>
      <ContextProvider>
        <AppBackContextProvider backHandler={() => false}>
          <AppModalNavigationProvider>
            <NavigationContainer
              linking={AppLinking}
              ref={RootNavigation}
              onReady={() => {
                DdRumReactNavigationTracking.startTrackingViews(RootNavigation.current);
              }}>
              <Navigation />
            </NavigationContainer>
          </AppModalNavigationProvider>
        </AppBackContextProvider>
      </ContextProvider>
    </AppWindowsSizeProvider>
  </SafeAreaProvider>
);
export default App;
