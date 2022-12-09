import React, { useContext } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet } from "react-native";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { gestureHandlerRootHOC } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppContext } from "@/components/ContextProvider";
import SignUpScreen, { SignUpStep } from "@/screens/signUp/SignUpScreen";
import { AppIcon, IconName } from "@/components/base/AppIcon";
import EmptyScreen from "@/screens/EmptyScreen";
import { AppColors } from "@/theme/colors";
import { AppDimensions } from "@/theme/dimensions";
import { LianeModalScreen } from "@/screens/LianeModalScreen";
import HomeScreen from "@/screens/HomeScreen";
import { AppText } from "@/components/base/AppText";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Navigation() {

  const insets = useSafeAreaInsets();
  const { authUser } = useContext(AppContext);

  if (authUser) {
    return (

      <BottomSheetModalProvider>
        <Tab.Navigator screenOptions={{
          tabBarStyle: [styles.bottomBarStyle, { height: AppDimensions.bottomBar.height + insets.bottom, paddingBottom: 8 + insets.bottom }]

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
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ headerShown: false }}
        initialParams={{ signUpStep: SignUpStep.SetPhoneNumber }}
        getId={({ params }) => params.signUpStep}
      />
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

            tabBarLabel: ({ focused }) => (
              <AppText
                style={[styles.labelStyle, { color: focused ? AppColors.blue500 : AppColors.blue700 }]}
              >
                {label}
              </AppText>
            ),
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
  labelStyle: {
    fontSize: AppDimensions.textSize.small,
    fontWeight: "400"
  }

});

// Wrap Component to allow bottom sheets scrolling on Android
export default gestureHandlerRootHOC(Navigation);
