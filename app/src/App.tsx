import React from "react";
import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "react-query";
import { AppColorPalettes } from "@/theme/colors";
import ContextProvider from "@/components/ContextProvider";
import { RootNavigation } from "@/api/navigation";
import Navigation from "@/components/Navigation";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ContextProvider>
      <StatusBar backgroundColor={AppColorPalettes.gray[800]} />
      <SafeAreaProvider>
        <NavigationContainer
          ref={RootNavigation}
          // onReady={() => {
          //   DdRumReactNavigationTracking.startTrackingViews(
          //     RootNavigation.current
          //   );
          // }}
        >
          <Navigation />
        </NavigationContainer>
      </SafeAreaProvider>
    </ContextProvider>
  </QueryClientProvider>
);
export default App;
