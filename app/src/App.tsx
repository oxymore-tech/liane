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
import { AppColors } from "@/theme/colors";
import ContextProvider from "@/components/ContextProvider";
import { RootNavigation } from "@/api/navigation";
import Navigation from "@/components/Navigation";

const App = () => (
  <ContextProvider>
    <StatusBar backgroundColor={AppColors.gray800} />
    <SafeAreaProvider>
      <NavigationContainer ref={RootNavigation}>
        <Navigation />
      </NavigationContainer>
    </SafeAreaProvider>
  </ContextProvider>
);
export default App;
