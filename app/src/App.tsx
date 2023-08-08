import React from "react";
import { StatusBar } from "react-native";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "react-query";
import ContextProvider from "@/components/ContextProvider";
import MapLibreGL from "@maplibre/maplibre-react-native";
import { AppWindowsSizeProvider } from "@/components/base/AppWindowsSizeProvider";
import { AppBackContextProvider } from "@/components/AppBackContextProvider";
import Navigation from "@/components/Navigation";
import { AppLinking, RootNavigation } from "@/api/navigation";
import { NavigationContainer } from "@react-navigation/native";

const queryClient = new QueryClient();
MapLibreGL.setAccessToken(null);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AppWindowsSizeProvider>
        <ContextProvider>
          <AppBackContextProvider backHandler={() => false}>
            <NavigationContainer
              linking={AppLinking}
              ref={RootNavigation}
              // onReady={() => {
              //   DdRumReactNavigationTracking.startTrackingViews(
              //     RootNavigation.current
              //   );
              // }}
            >
              <Navigation />
            </NavigationContainer>
          </AppBackContextProvider>
        </ContextProvider>
      </AppWindowsSizeProvider>
    </SafeAreaProvider>
  </QueryClientProvider>
);
export default App;
