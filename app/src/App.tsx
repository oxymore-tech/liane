/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import { StatusBar } from "react-native";

import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "react-query";
import { AppColors } from "@/theme/colors";
import ContextProvider from "@/components/ContextProvider";
import { RootNavigation } from "@/api/navigation";
import Navigation from "@/components/Navigation";

const queryClient = new QueryClient();

const App = () => (
  <ContextProvider>
    <QueryClientProvider client={queryClient}>
      <StatusBar backgroundColor={AppColors.gray800} />
      <SafeAreaProvider>
        <NavigationContainer ref={RootNavigation}>
          <Navigation />
        </NavigationContainer>
      </SafeAreaProvider>
    </QueryClientProvider>
  </ContextProvider>
);
export default App;
