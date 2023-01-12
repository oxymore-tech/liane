import { StatusBar } from "react-native";

import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "react-query";
import React from "react";
import { AppColors } from "@/theme/colors";
import ContextProvider from "@/components/ContextProvider";
import { RootNavigation } from "@/api/navigation";
import Navigation from "@/components/Navigation";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ContextProvider>
      <StatusBar backgroundColor={AppColors.gray800} />
      <SafeAreaProvider>
        <NavigationContainer ref={RootNavigation}>
          <Navigation />
        </NavigationContainer>
      </SafeAreaProvider>
    </ContextProvider>
  </QueryClientProvider>
);
export default App;
