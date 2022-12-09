import React, { useContext } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet } from "react-native";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { gestureHandlerRootHOC } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppContext } from "@/components/ContextProvider";
import SignUpScreen from "@/screens/signUp/SignUpScreen";
import SignUpCodeScreen from "@/screens/signUp/SignUpCodeScreen";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import EmptyScreen from "@/screens/EmptyScreen";
import { AppColors } from "@/theme/colors";
import { AppDimensions } from "@/theme/dimensions";
import { LianeModalScreen } from "@/screens/LianeModalScreen";
import HomeScreen from "@/screens/HomeScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Navigation() {

  const insets = useSafeAreaInsets();
  const { authUser } = useContext(AppContext);

  if (authUser) {
    return (

      <BottomSheetModalProvider>
        <Tab.Navigator screenOptions={{
          tabBarStyle: [styles.bottomBarStyle, { height: AppDimensions.bottomBarHeight + insets.bottom, paddingBottom: 8 + insets.bottom }],
          tabBarLabelStyle: styles.labelStyle
        }}
        >

          { makeTab("Accueil", "home-outline", HomeScreen)}
          { makeTab("Mes trajets", "flag-outline", EmptyScreen)}
          <Tab.Screen
            name="Liane"
            component={LianeModalScreen}
            options={{
              tabBarButton: () => (<LianeModalScreen />)
            }}
          />
          { makeTab("Conversations", "message-circle-outline", EmptyScreen)}
          { makeTab("Demandes", "bell-outline", EmptyScreen)}

        </Tab.Navigator>
      </BottomSheetModalProvider>
    );
  }

  return (
    <Stack.Navigator>
      <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SignUpCode" component={SignUpCodeScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

const makeTab = (label: string,
  iconName: IconName,
  screen: any) => (
    <Tab.Screen
      name={label}
      component={screen}
      options={
          {
            tabBarIcon: ({ focused }) => (
              <AppIcon
                name={iconName}
                color={focused ? AppColors.blue500 : AppColors.blue700}
              />
            )
          }
      }
    />
);

const styles = StyleSheet.create({
  bottomBarStyle: {
    position: "absolute",
    borderTopLeftRadius: AppDimensions.borderRadius,
    borderTopRightRadius: AppDimensions.borderRadius,
    overflow: "hidden"
  },
  labelStyle: { // TODO fonts
    fontFamily: "Inter"
  }

});

// Wrap Component to allow bottom sheets scrolling on Android
export default gestureHandlerRootHOC(Navigation);
